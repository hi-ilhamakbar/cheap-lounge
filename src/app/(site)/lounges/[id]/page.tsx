import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getActiveLounge } from "@/lib/lounges/service";
import { Notice } from "@/components/Notice";
import { Unavailable } from "@/components/LoungeCard";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LoungeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getDict();
  const lounge = await getActiveLounge(id);
  if (!lounge) notFound();

  const rows: { label: string; value: string | null }[] = [
    { label: t.lounge.terminal, value: lounge.terminal },
    { label: t.lounge.location, value: lounge.location },
    { label: t.lounge.hours, value: lounge.openingHours },
    { label: t.lounge.access, value: lounge.accessInfo },
    { label: t.lounge.conditions, value: lounge.conditions },
  ];

  return (
    <div className="container-page py-10 sm:py-14">
      <Link href={`/airports/${lounge.airportIata}`} className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900">
        <IconChevronLeft className="size-4" /> {t.lounge.back}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="eyebrow">
            {lounge.airport.name} ({lounge.airport.iata})
          </p>
          <h1 className="heading-display mt-2 text-3xl sm:text-4xl">{lounge.name}</h1>

          {lounge.images.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {lounge.images.slice(0, 4).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- provider CDN images
                <img key={src} src={src} alt={`${lounge.name} ${i + 1}`} className={`w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 aspect-[16/8]" : "aspect-[4/3]"}`} referrerPolicy="no-referrer" />
              ))}
            </div>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-semibold">{t.lounge.description}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600">{lounge.description ?? <Unavailable t={t} />}</p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">{t.lounge.facilities}</h2>
            {lounge.facilities.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {lounge.facilities.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-navy-800">
                    <IconCheck className="size-4 text-accent-600" /> {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm"><Unavailable t={t} /></p>
            )}
          </section>

          <dl className="mt-8 divide-y divide-navy-100 rounded-2xl border border-navy-100">
            {rows.map((r) => (
              <div key={r.label} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]">
                <dt className="text-sm font-medium text-slate-500">{r.label}</dt>
                <dd className="whitespace-pre-line text-sm text-navy-900">{r.value ?? <Unavailable t={t} />}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-4 p-6">
            <Notice>{t.lounge.disclaimer}</Notice>
            <p className="text-xs text-slate-500">
              {t.lounge.source}: {lounge.source === "LOUNGEKEY" ? t.lounge.sourceLoungeKey : t.lounge.sourceManual} ·{" "}
              {new Date(lounge.syncedAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB")}
            </p>
            <Link href={`/book?lounge=${lounge.id}`} className="btn-primary w-full">
              {t.lounge.select} <IconChevronRight className="size-4" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
