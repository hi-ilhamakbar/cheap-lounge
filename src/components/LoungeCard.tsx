import Link from "next/link";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { LoungeView } from "@/lib/lounges/types";
import { IconClock, IconMapPin, IconChevronRight, IconCheck } from "./icons";

export function Unavailable({ t }: { t: Dict }) {
  return <span className="italic text-slate-400">{t.lounge.infoUnavailable}</span>;
}

export function LoungeCard({ lounge, t }: { lounge: LoungeView; t: Dict }) {
  const img = lounge.images[0];
  return (
    <article className="card flex flex-col overflow-hidden transition hover:shadow-lift">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-navy-800 to-navy-950">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- images come from the authorized provider's CDN
          <img src={img} alt={lounge.name} loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs uppercase tracking-[0.2em] text-navy-100/70">
            {lounge.airportIata} · Lounge
          </div>
        )}
        {lounge.terminal && (
          <span className="badge absolute left-3 top-3 bg-white/95 text-navy-900 shadow-sm">
            {t.lounge.terminal} {lounge.terminal}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-navy-900">{lounge.name}</h3>
        <dl className="mt-3 space-y-2 text-sm text-slate-600">
          <div className="flex gap-2">
            <dt className="sr-only">{t.lounge.location}</dt>
            <IconMapPin className="mt-0.5 size-4 shrink-0 text-navy-700" />
            <dd className="line-clamp-2">{lounge.location ?? <Unavailable t={t} />}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">{t.lounge.hours}</dt>
            <IconClock className="mt-0.5 size-4 shrink-0 text-navy-700" />
            <dd className="line-clamp-2 whitespace-pre-line">{lounge.openingHours ?? <Unavailable t={t} />}</dd>
          </div>
        </dl>
        {lounge.facilities.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {lounge.facilities.slice(0, 5).map((f) => (
              <li key={f} className="badge bg-navy-50 text-navy-700">
                <IconCheck className="size-3" /> {f}
              </li>
            ))}
            {lounge.facilities.length > 5 && <li className="badge bg-navy-50 text-navy-700">+{lounge.facilities.length - 5}</li>}
          </ul>
        )}
        <div className="mt-auto flex gap-2 pt-5">
          <Link href={`/lounges/${lounge.id}`} className="btn-ghost flex-1 px-3">
            {t.lounge.details}
          </Link>
          <Link href={`/book?lounge=${lounge.id}`} className="btn-primary flex-1 px-3">
            {t.lounge.select} <IconChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
