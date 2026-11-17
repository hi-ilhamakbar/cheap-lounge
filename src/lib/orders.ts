import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma, type EmailType, type OrderStatus } from "@prisma/client";
import { prisma } from "./db";
import { logger } from "./logger";
import { calculatePrice } from "./pricing";
import { isWithinBookingWindow, localTodayFromOffset } from "./dates";
import { generateAccessToken, generateOrderCode } from "./order-code";
import { getActiveLounge } from "./lounges/service";
import { sendOrderEmail } from "./email/notifications";
import { canTransition } from "./order-status";
import { ALLOWED_PROOF_MIME, MAX_PROOF_BYTES } from "./business";
import type { CreateOrderInput } from "./validation";

/** Errors carry an i18n key so API routes can return a translated message. */
export class OrderError extends Error {
  constructor(public readonly key: string, public readonly status = 400, public readonly field?: string) {
    super(key);
    this.name = "OrderError";
  }
}

const isUniqueViolation = (e: unknown, field?: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError &&
  e.code === "P2002" &&
  (!field || JSON.stringify(e.meta?.target ?? "").includes(field));

async function emailStatusFor(orderId: string) {
  const n = await prisma.emailNotification.findUnique({ where: { orderId_type: { orderId, type: "ORDER_CONFIRMATION" } } });
  return n?.status ?? "PENDING";
}

export type CreateOrderResult = { orderCode: string; accessToken: string; emailStatus: string; duplicate: boolean };

export async function createOrder(input: CreateOrderInput, clientIp: string | null): Promise<CreateOrderResult> {
  // 1. Idempotency: the same submission (refresh / double-click / network retry) returns the same order.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    return { orderCode: existing.orderCode, accessToken: existing.accessToken, emailStatus: await emailStatusFor(existing.id), duplicate: true };
  }

  // 2. Visit date: today … today+90 in the customer's local calendar.
  const localToday = localTodayFromOffset(new Date(), input.tzOffsetMinutes);
  if (!isWithinBookingWindow(input.visitDate, localToday)) throw new OrderError("errors.dateOutOfRange", 400, "visitDate");

  // 3. Lounge must exist in the authorized data source and belong to the chosen airport.
  const lounge = await getActiveLounge(input.loungeId);
  if (!lounge || lounge.airportIata !== input.airportIata) throw new OrderError("errors.loungeInvalid", 400, "loungeId");

  // 4. Price is ALWAYS recalculated on the server.
  const price = calculatePrice(input.adultQty, input.childQty);
  const visitDate = new Date(`${input.visitDate}T00:00:00.000Z`);

  // 5. Secondary duplicate guard: an identical unpaid order placed in the last 15 minutes.
  const recent = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      loungeId: lounge.id,
      visitDate,
      adultQty: price.adultQty,
      childQty: price.childQty,
      createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
      customer: { email: input.email, whatsapp: input.whatsapp },
    },
    include: { passengers: true },
  });
  const wantNames = JSON.stringify([...input.adultNames.map((n) => `A:${n}`), ...input.childNames.map((n) => `C:${n}`)].sort());
  const dup = recent.find(
    (o) => JSON.stringify(o.passengers.map((p) => `${p.type === "ADULT" ? "A" : "C"}:${p.fullName}`).sort()) === wantNames,
  );
  if (dup) {
    logger.info("order_duplicate_detected", { orderCode: dup.orderCode });
    return { orderCode: dup.orderCode, accessToken: dup.accessToken, emailStatus: await emailStatusFor(dup.id), duplicate: true };
  }

  // 6. Persist (retry if the random order code collides).
  let order: { id: string; orderCode: string; accessToken: string } | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { email_whatsapp: { email: input.email, whatsapp: input.whatsapp } },
          update: input.customerName ? { name: input.customerName } : {},
          create: { email: input.email, whatsapp: input.whatsapp, name: input.customerName ?? null },
        });
        const created = await tx.order.create({
          data: {
            orderCode: generateOrderCode(),
            accessToken: generateAccessToken(),
            idempotencyKey: input.idempotencyKey,
            language: input.language,
            customerId: customer.id,
            airportIata: lounge.airport.iata,
            airportName: lounge.airport.name,
            airportCity: lounge.airport.city,
            airportCountry: lounge.airport.country,
            loungeId: lounge.id,
            loungeSource: lounge.source,
            loungeExternalId: lounge.externalId,
            loungeName: lounge.name,
            loungeTerminal: lounge.terminal,
            visitDate,
            adultQty: price.adultQty,
            childQty: price.childQty,
            adultUnitPrice: price.adultUnitPrice,
            childUnitPrice: price.childUnitPrice,
            adultSubtotal: price.adultSubtotal,
            childSubtotal: price.childSubtotal,
            totalAmount: price.totalAmount,
            currency: price.currency,
            termsAcceptedAt: new Date(),
            clientIp,
            passengers: {
              create: [
                ...input.adultNames.map((fullName, i) => ({ type: "ADULT" as const, position: i + 1, fullName })),
                ...input.childNames.map((fullName, i) => ({ type: "CHILD" as const, position: i + 1, fullName })),
              ],
            },
            events: { create: { action: "ORDER_CREATED", toStatus: "PENDING_PAYMENT" } },
          },
          select: { id: true, orderCode: true, accessToken: true },
        });
        return created;
      });
    } catch (e) {
      if (isUniqueViolation(e, "idempotencyKey")) {
        const o = await prisma.order.findUniqueOrThrow({ where: { idempotencyKey: input.idempotencyKey } });
        return { orderCode: o.orderCode, accessToken: o.accessToken, emailStatus: await emailStatusFor(o.id), duplicate: true };
      }
      if (!isUniqueViolation(e, "orderCode")) throw e;
    }
  }
  if (!order) throw new OrderError("errors.server", 500);
  logger.info("order_created", { orderCode: order.orderCode, total: price.totalAmount });

  // 7. Confirmation email (customer + CC). Failure never loses the order; the cron retries it.
  let emailStatus = "FAILED";
  try {
    emailStatus = (await sendOrderEmail(order.id, "ORDER_CONFIRMATION")).status;
  } catch (error) {
    logger.error("order_confirmation_email_crashed", { orderCode: order.orderCode, error });
  }
  return { orderCode: order.orderCode, accessToken: order.accessToken, emailStatus, duplicate: false };
}

function tokenMatches(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Loads an order for its customer (requires the secret access token from the confirmation link). */
export async function getCustomerOrder(orderCode: string, token: string) {
  if (!orderCode || !token) return null;
  const order = await prisma.order.findUnique({
    where: { orderCode },
    include: {
      customer: true,
      passengers: { orderBy: [{ type: "asc" }, { position: "asc" }] },
      payments: { orderBy: { submittedAt: "desc" }, select: { id: true, status: true, submittedAt: true, rejectionReason: true, amount: true } },
      emails: { where: { type: "ORDER_CONFIRMATION" }, select: { status: true } },
    },
  });
  if (!order || !tokenMatches(order.accessToken, token)) return null;
  return order;
}

/** Detects the real file type from magic bytes (never trust the client-provided MIME). */
export function sniffMime(buf: Uint8Array): string | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

export async function submitPaymentProof(args: {
  orderCode: string;
  token: string;
  file: File;
  payerName?: string;
  note?: string;
}) {
  const order = await getCustomerOrder(args.orderCode, args.token);
  if (!order) throw new OrderError("errors.generic", 404);
  if (order.status === "PAYMENT_SUBMITTED") throw new OrderError("errors.proofAlreadyPending", 409);
  if (order.status !== "PENDING_PAYMENT") throw new OrderError("errors.orderNotPayable", 409);

  if (!args.file || args.file.size === 0) throw new OrderError("errors.fileRequired", 400, "file");
  if (args.file.size > MAX_PROOF_BYTES) throw new OrderError("errors.fileTooLarge", 400, "file");
  const buf = new Uint8Array(await args.file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !(ALLOWED_PROOF_MIME as readonly string[]).includes(mime)) throw new OrderError("errors.fileType", 400, "file");
  const sha = createHash("sha256").update(buf).digest("hex");
  const filename = (args.file.name || "proof").replace(/[^\w.\-]+/g, "_").slice(0, 120);

  try {
    await prisma.$transaction(async (tx) => {
      // Conditional transition prevents two concurrent submissions both succeeding.
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PAYMENT_SUBMITTED" },
      });
      if (moved.count !== 1) throw new OrderError("errors.proofAlreadyPending", 409);
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          payerName: args.payerName?.slice(0, 100) || null,
          customerNote: args.note?.slice(0, 500) || null,
          proofData: Buffer.from(buf),
          proofMime: mime,
          proofFilename: filename,
          proofSha256: sha,
        },
      });
      await tx.orderEvent.create({
        data: { orderId: order.id, action: "PAYMENT_PROOF_SUBMITTED", fromStatus: "PENDING_PAYMENT", toStatus: "PAYMENT_SUBMITTED" },
      });
    });
  } catch (e) {
    if (isUniqueViolation(e, "proofSha256")) throw new OrderError("errors.duplicateProof", 409, "file");
    throw e;
  }
  logger.info("payment_proof_submitted", { orderCode: order.orderCode });
}

// ── Admin operations ─────────────────────────────────────────────────────

async function notify(orderId: string, type: EmailType, force = false) {
  try {
    await sendOrderEmail(orderId, type, { force });
  } catch (error) {
    logger.error("status_email_crashed", { orderId, type, error });
  }
}

export async function adminVerifyPayment(paymentId: string, adminId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "SUBMITTED") throw new OrderError("Payment is not awaiting verification", 409);
  await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({
      where: { id: payment.orderId, status: "PAYMENT_SUBMITTED" },
      data: { status: "PAYMENT_VERIFIED", paymentVerifiedAt: new Date() },
    });
    if (moved.count !== 1) throw new OrderError("Order is not in Payment Submitted state", 409);
    await tx.payment.update({ where: { id: paymentId }, data: { status: "VERIFIED", reviewedAt: new Date(), reviewedById: adminId } });
    await tx.orderEvent.create({
      data: { orderId: payment.orderId, action: "PAYMENT_VERIFIED", fromStatus: "PAYMENT_SUBMITTED", toStatus: "PAYMENT_VERIFIED", adminId },
    });
  });
  await notify(payment.orderId, "PAYMENT_VERIFIED");
}

export async function adminRejectPayment(paymentId: string, reason: string, adminId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "SUBMITTED") throw new OrderError("Payment is not awaiting verification", 409);
  const cleanReason = reason.trim().slice(0, 300) || "Payment could not be verified";
  await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: payment.orderId, status: "PAYMENT_SUBMITTED" }, data: { status: "PENDING_PAYMENT" } });
    if (moved.count !== 1) throw new OrderError("Order is not in Payment Submitted state", 409);
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: adminId, rejectionReason: cleanReason },
    });
    await tx.orderEvent.create({
      data: { orderId: payment.orderId, action: "PAYMENT_REJECTED", fromStatus: "PAYMENT_SUBMITTED", toStatus: "PENDING_PAYMENT", note: cleanReason, adminId },
    });
  });
  await notify(payment.orderId, "PAYMENT_REJECTED", true);
}

export async function adminChangeStatus(orderId: string, to: OrderStatus, note: string | undefined, adminId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("Order not found", 404);
  if (!canTransition(order.status, to)) throw new OrderError(`Cannot change ${order.status} → ${to}`, 409);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status: to,
        ...(to === "COMPLETED" ? { completedAt: now } : {}),
        ...(to === "CANCELLED" ? { cancelledAt: now } : {}),
        ...(note ? { adminNote: note.slice(0, 1000) } : {}),
      },
    });
    if (moved.count !== 1) throw new OrderError("Order was modified concurrently; reload and try again", 409);
    await tx.orderEvent.create({ data: { orderId, action: "STATUS_CHANGED", fromStatus: order.status, toStatus: to, note: note?.slice(0, 1000), adminId } });
  });
  if (to === "COMPLETED") await notify(orderId, "ORDER_COMPLETED");
}

export async function adminResendEmail(orderId: string, type: EmailType, adminId: string) {
  await sendOrderEmail(orderId, type, { force: true });
  await prisma.orderEvent.create({ data: { orderId, action: `EMAIL_RESENT_${type}`, adminId } });
}
