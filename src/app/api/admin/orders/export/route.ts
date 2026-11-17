import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth/session";
import { buildOrderWhere } from "@/lib/admin/order-filters";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV (UTF-8 with BOM so Excel opens it correctly) of orders matching the current filters. */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(sp),
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: {
      customer: true,
      passengers: { orderBy: [{ type: "asc" }, { position: "asc" }] },
      emails: { where: { type: "ORDER_CONFIRMATION" }, select: { status: true } },
    },
  });
  const header = [
    "Order ID", "Created (UTC)", "Status", "Language", "Customer Name", "Email", "WhatsApp",
    "Airport", "IATA", "Lounge", "Terminal", "Visit Date", "Adults", "Children",
    "Adult Names", "Child Names", "Adult Subtotal (IDR)", "Child Subtotal (IDR)", "Total (IDR)",
    "Payment Verified At", "Completed At", "Confirmation Email",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const o of orders) {
    lines.push(
      [
        o.orderCode, o.createdAt.toISOString(), o.status, o.language, o.customer.name, o.customer.email, o.customer.whatsapp,
        o.airportName, o.airportIata, o.loungeName, o.loungeTerminal, o.visitDate.toISOString().slice(0, 10), o.adultQty, o.childQty,
        o.passengers.filter((p) => p.type === "ADULT").map((p) => p.fullName).join("; "),
        o.passengers.filter((p) => p.type === "CHILD").map((p) => p.fullName).join("; "),
        o.adultSubtotal, o.childSubtotal, o.totalAmount,
        o.paymentVerifiedAt?.toISOString(), o.completedAt?.toISOString(), o.emails[0]?.status ?? "",
      ].map(csvCell).join(","),
    );
  }
  const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
