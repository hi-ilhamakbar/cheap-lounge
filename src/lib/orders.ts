import "server-only";
import { createHash } from "node:crypto";
import { logger } from "./logger";
import { calculatePrice } from "./pricing";
import { isWithinBookingWindow, localTodayFromOffset } from "./dates";
import { getActiveLounge } from "./lounges/service";
import { ALLOWED_PROOF_MIME, INTERNAL_CC_EMAILS, MAX_PROOF_BYTES } from "./business";
import { deriveOrderCode, openOrder, orderSecret, sealOrder, type OrderRecord } from "./order-token";
import { renderOrderEmail, type EmailKind, type EmailOrder } from "./email/templates";
import { sendEmail } from "./email/send";
import type { CreateOrderInput } from "./validation";

/**
 * NO DATABASE. The confirmation email (customer + CC to both internal addresses) IS the order record.
 * If that email cannot be sent, the order is NOT accepted and the customer is told to retry — the
 * retry reuses the same idempotency key, so it gets the same Order ID and cannot create a duplicate.
 */

export class OrderError extends Error {
  constructor(public readonly key: string, public readonly status = 400, public readonly field?: string) {
    super(key);
    this.name = "OrderError";
  }
}

export function ccRecipients(): string[] {
  const extra = (process.env.EMAIL_EXTRA_CC ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  return Array.from(new Set([...INTERNAL_CC_EMAILS, ...extra]));
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function orderLink(order: OrderRecord, token: string) {
  return `${appUrl()}/order/${order.code}?d=${token}`;
}

function toEmailOrder(o: OrderRecord, token: string, status: string): EmailOrder {
  return {
    orderCode: o.code,
    language: o.lang,
    status,
    customerName: o.customer.name,
    email: o.customer.email,
    whatsapp: o.customer.whatsapp,
    airportName: o.airport.name,
    airportIata: o.airport.iata,
    airportCity: o.airport.city,
    loungeName: o.lounge.name,
    loungeTerminal: o.lounge.terminal,
    visitDate: o.visitDate,
    adultQty: o.price.adultQty,
    childQty: o.price.childQty,
    adultUnitPrice: o.price.adultUnitPrice,
    childUnitPrice: o.price.childUnitPrice,
    adultSubtotal: o.price.adultSubtotal,
    childSubtotal: o.price.childSubtotal,
    totalAmount: o.price.totalAmount,
    adultNames: o.adultNames,
    childNames: o.childNames,
    orderUrl: orderLink(o, token),
  };
}

async function sendOrderEmail(
  kind: EmailKind,
  order: OrderRecord,
  token: string,
  idempotencyKey: string,
  extra?: { payment?: EmailOrder["payment"]; attachments?: { filename: string; content: Buffer; contentType: string }[] },
) {
  const status = kind === "ORDER_CONFIRMATION" ? "PENDING_PAYMENT" : "PAYMENT_SUBMITTED";
  const { subject, html, text } = renderOrderEmail(kind, { ...toEmailOrder(order, token, status), payment: extra?.payment });
  return sendEmail({ to: order.customer.email, cc: ccRecipients(), subject, html, text, idempotencyKey, attachments: extra?.attachments });
}

export type CreateOrderResult = { orderCode: string; token: string };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const secret = orderSecret();

  const localToday = localTodayFromOffset(new Date(), input.tzOffsetMinutes);
  if (!isWithinBookingWindow(input.visitDate, localToday)) throw new OrderError("errors.dateOutOfRange", 400, "visitDate");

  const lounge = await getActiveLounge(input.loungeId);
  if (!lounge || lounge.airportIata !== input.airportIata) throw new OrderError("errors.loungeInvalid", 400, "loungeId");

  // Price is ALWAYS recalculated on the server.
  const price = calculatePrice(input.adultQty, input.childQty);

  const order: OrderRecord = {
    v: 1,
    code: deriveOrderCode(secret, input.idempotencyKey),
    createdAt: new Date().toISOString(),
    lang: input.language,
    customer: { name: input.customerName ?? null, email: input.email, whatsapp: input.whatsapp },
    airport: lounge.airport,
    lounge: { id: lounge.id, name: lounge.name, terminal: lounge.terminal, source: lounge.source, externalId: lounge.externalId },
    visitDate: input.visitDate,
    adultNames: input.adultNames,
    childNames: input.childNames,
    price,
  };
  const token = sealOrder(order, secret);

  // The provider de-duplicates the same Idempotency-Key for 24 h → no duplicate confirmations.
  const result = await sendOrderEmail("ORDER_CONFIRMATION", order, token, `${order.code}-ORDER_CONFIRMATION`);
  if (!result.ok) {
    logger.error("order_email_failed", { orderCode: order.code, error: result.error });
    throw new OrderError("errors.orderEmailFailed", 502);
  }
  logger.info("order_created", { orderCode: order.code, total: price.totalAmount, emailId: result.id });
  return { orderCode: order.code, token };
}

export function readOrder(orderCode: string, token: string): OrderRecord | null {
  if (!orderCode || !token) return null;
  const o = openOrder(token, orderSecret());
  return o && o.code === orderCode ? o : null;
}

/** Detects the real file type from magic bytes (never trust the client-provided MIME). */
export function sniffMime(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

/**
 * Emails the payment proof (as an attachment) to the customer with CC to both internal addresses.
 * Staff verify the money against the QRIS merchant account and reply by email/WhatsApp.
 * Uploading never marks an order as paid.
 */
export async function submitPaymentProof(args: { orderCode: string; token: string; file: File; payerName?: string; note?: string }) {
  const order = readOrder(args.orderCode, args.token);
  if (!order) throw new OrderError("errors.generic", 404);
  if (!args.file || args.file.size === 0) throw new OrderError("errors.fileRequired", 400, "file");
  if (args.file.size > MAX_PROOF_BYTES) throw new OrderError("errors.fileTooLarge", 400, "file");
  const buf = Buffer.from(await args.file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !(ALLOWED_PROOF_MIME as readonly string[]).includes(mime)) throw new OrderError("errors.fileType", 400, "file");
  const sha = createHash("sha256").update(buf).digest("hex");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[mime];
  const filename = `${order.code}-payment-proof.${ext}`;

  // Same file for the same order within 24 h → provider de-duplicates (no duplicate submissions).
  const result = await sendOrderEmail("PAYMENT_SUBMITTED", order, args.token, `${order.code}-PROOF-${sha.slice(0, 32)}`, {
    payment: { payerName: args.payerName ?? null, note: args.note ?? null, fileName: filename },
    attachments: [{ filename, content: buf, contentType: mime }],
  });
  if (!result.ok) {
    logger.error("payment_proof_email_failed", { orderCode: order.code, error: result.error });
    throw new OrderError("errors.proofEmailFailed", 502);
  }
  logger.info("payment_proof_submitted", { orderCode: order.code, emailId: result.id });
}
