import "server-only";
import type { EmailType, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { logger } from "../logger";
import { INTERNAL_CC_EMAILS } from "../business";
import { renderOrderEmail, emailSubject, type EmailOrder } from "./templates";
import { sendViaResend } from "./resend";

export const MAX_EMAIL_ATTEMPTS = 6;

export function ccRecipients(): string[] {
  const extra = (process.env.EMAIL_EXTRA_CC ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  return Array.from(new Set([...INTERNAL_CC_EMAILS, ...extra]));
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

const orderInclude = {
  customer: true,
  passengers: { orderBy: [{ type: "asc" }, { position: "asc" }] },
  payments: { orderBy: { submittedAt: "desc" }, take: 1 },
} satisfies Prisma.OrderInclude;

type OrderWithRels = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toEmailOrder(o: OrderWithRels): EmailOrder {
  return {
    orderCode: o.orderCode,
    language: o.language,
    status: o.status,
    customerName: o.customer.name,
    email: o.customer.email,
    whatsapp: o.customer.whatsapp,
    airportName: o.airportName,
    airportIata: o.airportIata,
    airportCity: o.airportCity,
    loungeName: o.loungeName,
    loungeTerminal: o.loungeTerminal,
    visitDate: o.visitDate.toISOString().slice(0, 10),
    adultQty: o.adultQty,
    childQty: o.childQty,
    adultUnitPrice: o.adultUnitPrice,
    childUnitPrice: o.childUnitPrice,
    adultSubtotal: o.adultSubtotal,
    childSubtotal: o.childSubtotal,
    totalAmount: o.totalAmount,
    adultNames: o.passengers.filter((p) => p.type === "ADULT").map((p) => p.fullName),
    childNames: o.passengers.filter((p) => p.type === "CHILD").map((p) => p.fullName),
    orderUrl: `${appUrl()}/order/${o.orderCode}?t=${o.accessToken}`,
    rejectionReason: o.payments[0]?.status === "REJECTED" ? o.payments[0].rejectionReason : null,
  };
}

/**
 * Creates (once) and sends an order email. Exactly one row exists per (order, type), so refreshing
 * or retrying never sends a second confirmation. `force` re-sends (admin "resend", repeated
 * rejection notices) by bumping `generation`.
 */
export async function sendOrderEmail(orderId: string, type: EmailType, opts: { force?: boolean } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw new Error(`Order ${orderId} not found`);

  const subject = emailSubject(type, order.orderCode, order.language);
  const cc = ccRecipients();

  let notification = await prisma.emailNotification.upsert({
    where: { orderId_type: { orderId, type } },
    update: {},
    create: { orderId, type, toEmail: order.customer.email, ccEmails: cc, subject },
  });

  if (opts.force) {
    notification = await prisma.emailNotification.update({
      where: { id: notification.id },
      data: { status: "PENDING", attempts: 0, generation: { increment: 1 }, nextAttemptAt: new Date(), lastError: null, toEmail: order.customer.email, ccEmails: cc, subject },
    });
  } else if (notification.status === "SENT") {
    return notification; // already delivered — never duplicate
  }

  return attemptDelivery(notification.id, order);
}

async function attemptDelivery(notificationId: string, preloaded?: OrderWithRels) {
  const n = await prisma.emailNotification.findUniqueOrThrow({ where: { id: notificationId } });
  if (n.status === "SENT" || n.attempts >= MAX_EMAIL_ATTEMPTS) return n;

  // Optimistic claim: only one concurrent worker can move attempts from N to N+1.
  const claimed = await prisma.emailNotification.updateMany({
    where: { id: n.id, attempts: n.attempts, status: { not: "SENT" } },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return prisma.emailNotification.findUniqueOrThrow({ where: { id: n.id } });

  const order = preloaded ?? (await prisma.order.findUniqueOrThrow({ where: { id: n.orderId }, include: orderInclude }));
  const { html, text } = renderOrderEmail(n.type, toEmailOrder(order));

  const result = await sendViaResend({
    to: n.toEmail,
    cc: n.ccEmails,
    subject: n.subject,
    html,
    text,
    idempotencyKey: `${order.orderCode}-${n.type}-g${n.generation}`,
  });

  const attempts = n.attempts + 1;
  if (result.ok) {
    logger.info("email_sent", { orderCode: order.orderCode, type: n.type, providerId: result.id });
    return prisma.emailNotification.update({
      where: { id: n.id },
      data: { status: "SENT", sentAt: new Date(), providerMessageId: result.id, lastError: null },
    });
  }

  const giveUp = !result.retryable || attempts >= MAX_EMAIL_ATTEMPTS;
  const backoffMin = Math.min(5 * 2 ** (attempts - 1), 240); // 5, 10, 20, 40, 80 min…
  logger.error("email_send_failed", { orderCode: order.orderCode, type: n.type, attempts, error: result.error, giveUp });
  return prisma.emailNotification.update({
    where: { id: n.id },
    data: {
      status: "FAILED",
      lastError: result.error.slice(0, 500),
      nextAttemptAt: giveUp ? new Date(8.64e15) : new Date(Date.now() + backoffMin * 60_000),
    },
  });
}

/** Called by the cron endpoint: retries failed/pending emails whose backoff has elapsed. */
export async function retryDueEmails(limit = 20) {
  const due = await prisma.emailNotification.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: MAX_EMAIL_ATTEMPTS }, nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const results = [];
  for (const { id } of due) {
    try {
      const r = await attemptDelivery(id);
      results.push({ id, status: r.status });
    } catch (error) {
      logger.error("email_retry_crashed", { id, error });
      results.push({ id, status: "ERROR" });
    }
  }
  return results;
}
