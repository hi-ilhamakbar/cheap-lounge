import type { Prisma } from "@prisma/client";
import { isOrderStatus } from "../order-status";
import { isValidISODate } from "../dates";

export type OrderFilterParams = { q?: string; status?: string; from?: string; to?: string; page?: string };

/** Shared by the admin list and the CSV export so both always match. */
export function buildOrderWhere(p: OrderFilterParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const q = (p.q ?? "").trim().slice(0, 100);
  if (q) {
    const digits = q.replace(/[^\d]/g, "");
    where.OR = [
      { orderCode: { contains: q.toUpperCase() } },
      { customer: { email: { contains: q.toLowerCase() } } },
      ...(digits.length >= 4 ? [{ customer: { whatsapp: { contains: digits } } }] : []),
      { passengers: { some: { fullName: { contains: q, mode: "insensitive" as const } } } },
    ];
  }
  if (isOrderStatus(p.status)) where.status = p.status;
  const visit: Prisma.DateTimeFilter = {};
  if (p.from && isValidISODate(p.from)) visit.gte = new Date(`${p.from}T00:00:00Z`);
  if (p.to && isValidISODate(p.to)) visit.lte = new Date(`${p.to}T00:00:00Z`);
  if (visit.gte || visit.lte) where.visitDate = visit;
  return where;
}
