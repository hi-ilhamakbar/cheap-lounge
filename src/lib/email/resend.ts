import "server-only";

export type SendResult = { ok: true; id: string } | { ok: false; error: string; retryable: boolean };

/**
 * Sends through Resend's REST API. CC recipients are passed in the API `cc` field — they are real
 * recipients, not text in the body. The Idempotency-Key prevents duplicate sends of the same
 * logical email for 24h even if our request is retried.
 */
export async function sendViaResend(msg: {
  to: string;
  cc: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "Email provider not configured (RESEND_API_KEY / EMAIL_FROM)", retryable: true };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": msg.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        cc: msg.cc,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        attachments: msg.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
          content_type: a.contentType,
        })),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (res.ok && body.id) return { ok: true, id: body.id };
    // 409 = this Idempotency-Key was already used (a retry of an email that was already accepted,
    // or the same request still in flight). The email is not sent twice — treat as delivered.
    if (res.status === 409 && /idempotent/i.test(`${body.name ?? ""} ${body.message ?? ""}`)) {
      return { ok: true, id: "duplicate-suppressed" };
    }
    const retryable = res.status === 429 || res.status >= 500;
    return { ok: false, error: `Resend ${res.status}: ${body.message ?? body.name ?? "unknown error"}`, retryable };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error", retryable: true };
  } finally {
    clearTimeout(timer);
  }
}
