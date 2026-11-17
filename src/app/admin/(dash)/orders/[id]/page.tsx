import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatIDR } from "@/lib/pricing";
import { allowedNextStatuses } from "@/lib/order-status";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionForm } from "../../ActionForm";
import { changeStatusAction, rejectPaymentAction, resendEmailAction, verifyPaymentAction } from "../../../actions";

const STATUS_LABEL = dictionaries.en.status;
const dt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) + " WIB" : "—");

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      passengers: { orderBy: [{ type: "asc" }, { position: "asc" }] },
      payments: {
        orderBy: { submittedAt: "desc" },
        select: { id: true, status: true, amount: true, payerName: true, customerNote: true, proofMime: true, proofFilename: true, submittedAt: true, reviewedAt: true, rejectionReason: true, reviewedBy: { select: { email: true } } },
      },
      emails: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "desc" }, include: { admin: { select: { email: true } } } },
    },
  });
  if (!order) notFound();
  const next = allowedNextStatuses(order.status);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-navy-700 hover:underline">← All orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-2xl font-semibold">{order.orderCode}</h1>
        <StatusBadge status={order.status} label={STATUS_LABEL[order.status]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-2 p-5 text-sm lg:col-span-2">
          <h2 className="mb-2 font-semibold">Booking</h2>
          {[
            ["Created", dt(order.createdAt)],
            ["Language", order.language.toUpperCase()],
            ["Customer", `${order.customer.name ?? "—"} · ${order.customer.email} · ${order.customer.whatsapp}`],
            ["Airport", `${order.airportName} (${order.airportIata}), ${order.airportCity}, ${order.airportCountry}`],
            ["Lounge", `${order.loungeName}${order.loungeTerminal ? ` · Terminal ${order.loungeTerminal}` : ""}`],
            ["Lounge source", `${order.loungeSource} · ref ${order.loungeExternalId}`],
            ["Visit date", order.visitDate.toISOString().slice(0, 10)],
            ["Adults", `${order.adultQty} × ${formatIDR(order.adultUnitPrice, "id")} = ${formatIDR(order.adultSubtotal, "id")}`],
            ["Children", `${order.childQty} × ${formatIDR(order.childUnitPrice, "id")} = ${formatIDR(order.childSubtotal, "id")}`],
            ["Total", formatIDR(order.totalAmount, "id")],
            ["Terms accepted", dt(order.termsAcceptedAt)],
            ["Payment verified", dt(order.paymentVerifiedAt)],
            ["Completed", dt(order.completedAt)],
            ["Admin note", order.adminNote ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[150px_1fr] gap-3"><span className="text-slate-500">{k}</span><span className="break-words font-medium">{v}</span></div>
          ))}
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            {(["ADULT", "CHILD"] as const).map((type) => (
              <div key={type}>
                <p className="text-xs font-bold tracking-[0.12em] text-navy-700">{type === "ADULT" ? "ADULT PASSENGERS" : "CHILD PASSENGERS (<12)"}</p>
                <ol className="mt-1 list-decimal pl-5">
                  {order.passengers.filter((p) => p.type === type).map((p) => <li key={p.id}>{p.fullName}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Update status</h2>
          {next.length ? (
            <ActionForm action={changeStatusAction} submitLabel="Update status" confirm="Change the order status?">
              <input type="hidden" name="orderId" value={order.id} />
              <select name="status" className="field-input py-2 text-sm" required>
                {next.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <textarea name="note" rows={2} placeholder="Internal note (optional)" className="field-input py-2 text-sm" />
            </ActionForm>
          ) : (
            <p className="text-sm text-slate-500">No further manual transitions.</p>
          )}
          <p className="text-xs text-slate-500">
            Payment Verified can only be set by verifying an uploaded payment proof. Setting Completed emails the customer.
          </p>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Payment proofs</h2>
        {order.payments.length === 0 && <p className="mt-2 text-sm text-slate-500">No payment proof uploaded yet.</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {order.payments.map((p) => (
            <div key={p.id} className="rounded-xl border border-navy-100 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.status}</span>
                <span className="text-xs text-slate-500">{dt(p.submittedAt)}</span>
              </div>
              <p className="mt-1">Expected amount: <strong>{formatIDR(p.amount, "id")}</strong></p>
              {p.payerName && <p>Payer: {p.payerName}</p>}
              {p.customerNote && <p>Note: {p.customerNote}</p>}
              {p.reviewedAt && <p className="text-xs text-slate-500">Reviewed {dt(p.reviewedAt)} by {p.reviewedBy?.email ?? "—"}</p>}
              {p.rejectionReason && <p className="text-accent-700">Reason: {p.rejectionReason}</p>}
              <a href={`/api/admin/payments/${p.id}/proof`} target="_blank" rel="noopener" className="mt-3 block">
                {p.proofMime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element -- authenticated admin-only proof
                  <img src={`/api/admin/payments/${p.id}/proof`} alt="Payment proof" className="max-h-80 rounded-lg border border-navy-100 object-contain" />
                ) : (
                  <span className="underline">Open {p.proofFilename}</span>
                )}
              </a>
              {p.status === "SUBMITTED" && order.status === "PAYMENT_SUBMITTED" && (
                <div className="mt-4 grid gap-3 border-t border-navy-100 pt-4">
                  <p className="text-xs text-slate-600">Check the QRIS merchant dashboard / bank mutation for {formatIDR(p.amount, "id")} before verifying.</p>
                  <ActionForm action={verifyPaymentAction} submitLabel="Verify payment" confirm="Confirm the money has been received in the merchant account?">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input type="hidden" name="orderId" value={order.id} />
                  </ActionForm>
                  <ActionForm action={rejectPaymentAction} submitLabel="Reject proof" tone="danger" confirm="Reject this payment proof?">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input type="hidden" name="orderId" value={order.id} />
                    <input name="reason" required minLength={3} placeholder="Reason shown to customer" className="field-input py-2 text-sm" />
                  </ActionForm>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Email delivery</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr><th className="py-2">Type</th><th>Status</th><th>Attempts</th><th>To / CC</th><th>Sent</th><th>Last error</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-navy-100 align-top">
            {order.emails.map((e) => (
              <tr key={e.id}>
                <td className="py-2 font-medium">{e.type}</td>
                <td className={e.status === "SENT" ? "text-emerald-700" : e.status === "FAILED" ? "text-accent-700" : ""}>{e.status}</td>
                <td>{e.attempts}</td>
                <td className="text-xs">{e.toEmail}<br /><span className="text-slate-500">cc: {e.ccEmails.join(", ")}</span></td>
                <td className="text-xs">{dt(e.sentAt)}</td>
                <td className="max-w-xs break-words text-xs text-accent-700">{e.lastError ?? ""}</td>
                <td>
                  <ActionForm action={resendEmailAction} submitLabel="Resend" small confirm={`Resend ${e.type} email to customer and CC?`}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="type" value={e.type} />
                  </ActionForm>
                </td>
              </tr>
            ))}
            {order.emails.length === 0 && <tr><td colSpan={7} className="py-3 text-slate-500">No emails recorded.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Activity log</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.events.map((ev) => (
            <li key={ev.id} className="flex flex-wrap gap-x-3">
              <span className="text-xs text-slate-500">{dt(ev.createdAt)}</span>
              <span className="font-medium">{ev.action}</span>
              {ev.fromStatus && <span className="text-slate-600">{ev.fromStatus} → {ev.toStatus}</span>}
              {ev.admin && <span className="text-slate-500">by {ev.admin.email}</span>}
              {ev.note && <span className="text-slate-600">“{ev.note}”</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
