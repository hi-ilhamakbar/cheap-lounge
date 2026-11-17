import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildOrderWhere, type OrderFilterParams } from "@/lib/admin/order-filters";
import { ORDER_STATUSES } from "@/lib/order-status";
import { formatIDR } from "@/lib/pricing";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { StatusBadge } from "@/components/StatusBadge";

const PAGE_SIZE = 25;
const STATUS_LABEL = dictionaries.en.status;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<OrderFilterParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = buildOrderWhere(sp);
  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: true, emails: { where: { type: "ORDER_CONFIRMATION" }, select: { status: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `?${p.toString()}`;
  };
  const exportQs = qs({ page: "" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-slate-500">{total} matching</p>
        </div>
        <a href={`/api/admin/orders/export${exportQs}`} className="btn-ghost px-4 py-2">Export CSV (Excel)</a>
      </div>

      <div className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <Link key={c.status} href={qs({ status: c.status, page: 1 })} className="badge bg-white ring-1 ring-navy-100 hover:ring-navy-700/30">
            {STATUS_LABEL[c.status]}: {c._count._all}
          </Link>
        ))}
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Order ID, email, WhatsApp, passenger name" className="field-input py-2.5 text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="field-input py-2.5 text-sm">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <label className="text-xs text-slate-500">Visit from<input type="date" name="from" defaultValue={sp.from} className="field-input py-2 text-sm" /></label>
        <label className="text-xs text-slate-500">Visit to<input type="date" name="to" defaultValue={sp.to} className="field-input py-2 text-sm" /></label>
        <div className="flex items-end gap-2">
          <button className="btn-navy px-4 py-2.5">Filter</button>
          <Link href="/admin" className="btn-ghost px-4 py-2.5">Reset</Link>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-navy-100 bg-navy-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Lounge</th>
              <th className="px-4 py-3">Visit</th>
              <th className="px-4 py-3">Pax</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-navy-50/60">
                <td className="px-4 py-3 font-mono text-xs"><Link className="font-semibold text-navy-900 underline" href={`/admin/orders/${o.id}`}>{o.orderCode}</Link></td>
                <td className="px-4 py-3 text-xs text-slate-500">{o.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })}</td>
                <td className="px-4 py-3"><div>{o.customer.email}</div><div className="text-xs text-slate-500">{o.customer.whatsapp}</div></td>
                <td className="px-4 py-3"><div className="font-medium">{o.loungeName}</div><div className="text-xs text-slate-500">{o.airportIata}</div></td>
                <td className="px-4 py-3">{o.visitDate.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-3">{o.adultQty}A / {o.childQty}C</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatIDR(o.totalAmount, "id")}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} label={STATUS_LABEL[o.status]} /></td>
                <td className="px-4 py-3 text-xs">{o.emails[0]?.status ?? "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-ghost px-3 py-1.5" href={qs({ page: page - 1 })}>Previous</Link>}
            {page < pages && <Link className="btn-ghost px-3 py-1.5" href={qs({ page: page + 1 })}>Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
