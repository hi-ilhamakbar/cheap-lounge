import "server-only";
import { sendViaResend, type SendResult } from "./resend";
import { sendViaSmtp, smtpConfigured } from "./smtp";

export type OutgoingEmail = Parameters<typeof sendViaSmtp>[0];

/** EMAIL_PROVIDER=smtp | resend. Default: smtp when SMTP_* is set, otherwise resend. */
export function emailProvider(): "smtp" | "resend" | "none" {
  const p = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  if (p === "smtp" || (!p && smtpConfigured())) return smtpConfigured() ? "smtp" : "none";
  return process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "resend" : "none";
}

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const provider = emailProvider();
  if (provider === "smtp") return sendViaSmtp(msg);
  if (provider === "resend") return sendViaResend(msg);
  return { ok: false, error: "Email not configured (set SMTP_* or RESEND_API_KEY, and EMAIL_FROM)", retryable: true };
}
