import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { SendResult } from "./resend";

/**
 * SMTP sending (e.g. a cPanel mailbox such as orders@cheaplounge.com) via Nodemailer — the Node.js
 * equivalent of PHPMailer. CC recipients are real SMTP recipients (the `cc` field), not body text.
 */
let transporter: Transporter | null = null;

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return transporter;
}

/**
 * SMTP has no idempotency keys, so remember recently sent keys in memory (24 h). On cPanel the app
 * runs as one long-lived process, so refresh/double-click/retry won't send a second email.
 */
const sent = new Map<string, { at: number; id: string }>();
const DAY = 24 * 60 * 60 * 1000;

export async function sendViaSmtp(msg: {
  to: string;
  cc: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<SendResult> {
  const now = Date.now();
  for (const [k, v] of sent) if (now - v.at > DAY) sent.delete(k);
  const prev = sent.get(msg.idempotencyKey);
  if (prev) return { ok: true, id: prev.id };

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: msg.to,
      cc: msg.cc,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    });
    const rejected = (info.rejected ?? []).map(String);
    if (rejected.length) return { ok: false, error: `SMTP rejected: ${rejected.join(", ")}`, retryable: false };
    sent.set(msg.idempotencyKey, { at: now, id: info.messageId });
    return { ok: true, id: info.messageId };
  } catch (e) {
    return { ok: false, error: `SMTP: ${e instanceof Error ? e.message : String(e)}`, retryable: true };
  }
}
