import type { Metadata } from "next";
import Image from "next/image";
import { getDict } from "@/lib/i18n/server";
import { readOrder } from "@/lib/orders";
import { formatIDR } from "@/lib/pricing";
import { formatVisitDate } from "@/lib/dates";
import { QRIS } from "@/lib/business";
import { Notice } from "@/components/Notice";
import { SingleEntryNotice } from "@/components/SingleEntryNotice";
import { CopyButton } from "@/components/order/CopyButton";
import { PaymentProofForm } from "@/components/order/PaymentProofForm";
import { OrderStatus } from "@/components/order/OrderStatus";
import { whatsappLink } from "@/components/WhatsAppFloat";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderCode: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { orderCode } = await params;
  const { d: token } = await searchParams;
  const { t, lang } = await getDict();
  let order = null;
  try {
    order = readOrder(orderCode, token ?? "");
  } catch {
    order = null;
  }

  if (!order) {
    return (
      <div className="container-page max-w-xl py-16">
        <Notice tone="error">
          <p>{t.order.notFound}</p>
          <a className="font-semibold underline" href={whatsappLink(t.support.waMessage)} target="_blank" rel="noopener noreferrer">
            {t.support.button}
          </a>
        </Notice>
      </div>
    );
  }

  const p = order.price;
  const amount = formatIDR(p.totalAmount, lang);
  const visit = formatVisitDate(order.visitDate, lang);

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">{t.order.title}</p>
          <h1 className="heading-display mt-2 text-2xl sm:text-3xl">
            {t.order.orderId}: <span className="font-mono tracking-wide">{order.code}</span>
          </h1>
        </div>
      </div>

      <div className="mt-6">
        <Notice>
          {t.order.emailSent} <strong>{order.customer.email}</strong>.
        </Notice>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="card min-w-0 p-5 sm:p-7">
          <p className="text-lg font-semibold text-navy-900">{t.order.scanInstruction}</p>

          <div className="mt-5 rounded-2xl bg-navy-50 p-4 sm:p-5">
            <p className="text-sm text-slate-600">{t.order.amountLabel}</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="text-3xl font-bold tracking-tight text-navy-900 tabular-nums sm:text-4xl">{amount}</p>
              <CopyButton value={String(p.totalAmount)} label={t.order.copyAmount} copiedLabel={t.order.copied} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{t.order.amountNote}</p>
          </div>

          {/* Original QRIS image — displayed unmodified, nothing overlaid, aspect ratio preserved. */}
          <figure className="mx-auto mt-6 w-full max-w-[360px]" data-no-overlay>
            <Image
              src={QRIS.imagePath}
              alt={`QRIS ${QRIS.merchantName} — NMID ${QRIS.nmid}`}
              width={QRIS.width}
              height={QRIS.height}
              priority
              unoptimized
              className="h-auto w-full rounded-xl border border-navy-100 bg-white"
            />
            <figcaption className="mt-3 text-center text-xs text-slate-500">
              {t.order.merchant}: {QRIS.merchantName} · NMID {QRIS.nmid} · {QRIS.merchantCategory}
              <br />
              <a href={QRIS.imagePath} download className="font-semibold text-navy-700 underline">
                {t.order.downloadQris}
              </a>
            </figcaption>
          </figure>

          <div className="mt-6">
            <h2 className="font-semibold">{t.order.howToPay}</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-700">
              {t.order.paySteps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6">
            <SingleEntryNotice t={t} />
          </div>

          <div className="mt-8 border-t border-navy-100 pt-6">
            <h2 className="font-semibold">{t.order.uploadTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.order.uploadBody}</p>
            <PaymentProofForm orderCode={order.code} token={token!} />
          </div>
        </section>

        <section className="min-w-0 space-y-6">
          <OrderStatus orderCode={order.code} />

          <div className="card p-5 sm:p-7">
            <h2 className="font-semibold">{t.order.details}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                order.customer.name ? [t.booking.customerName.replace(/ \(.*\)$/, ""), order.customer.name] : null,
                [t.booking.whatsapp, order.customer.whatsapp],
                [t.booking.email, order.customer.email],
                [t.booking.airport, `${order.airport.name} (${order.airport.iata})`],
                [t.booking.lounge, order.lounge.name],
                [t.lounge.terminal, order.lounge.terminal ?? t.lounge.infoUnavailable],
                [t.booking.visitDate, visit],
                [t.booking.adults, String(p.adultQty)],
                [t.booking.children, String(p.childQty)],
              ]
                .filter((r): r is string[] => r !== null)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[130px_1fr] gap-3 sm:grid-cols-[160px_1fr]">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="break-words font-medium">{v}</dd>
                  </div>
                ))}
            </dl>

            <div className="mt-5 space-y-3">
              {order.adultNames.length > 0 && (
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-navy-700">{t.booking.adultSection}</p>
                  <ol className="mt-1.5 list-decimal pl-5 text-sm">
                    {order.adultNames.map((n, i) => <li key={`a${i}`}>{n}</li>)}
                  </ol>
                </div>
              )}
              {order.childNames.length > 0 && (
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-accent-700">{t.booking.childSection}</p>
                  <ol className="mt-1.5 list-decimal pl-5 text-sm">
                    {order.childNames.map((n, i) => <li key={`c${i}`}>{n}</li>)}
                  </ol>
                </div>
              )}
            </div>

            <dl className="mt-5 space-y-2 border-t border-navy-100 pt-4 text-sm">
              {p.adultQty > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">{t.booking.adultLine} {p.adultQty} × {formatIDR(p.adultUnitPrice, lang)}</dt>
                  <dd className="tabular-nums">{formatIDR(p.adultSubtotal, lang)}</dd>
                </div>
              )}
              {p.childQty > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">{t.booking.childLine} {p.childQty} × {formatIDR(p.childUnitPrice, lang)}</dt>
                  <dd className="tabular-nums">{formatIDR(p.childSubtotal, lang)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-bold">
                <dt>{t.booking.total}</dt>
                <dd className="tabular-nums">{amount}</dd>
              </div>
            </dl>
          </div>
          <p className="text-xs text-slate-500">{t.order.bookmark}</p>
        </section>
      </div>
    </div>
  );
}
