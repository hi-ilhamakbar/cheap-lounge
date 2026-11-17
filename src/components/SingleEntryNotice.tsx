import type { Dict } from "@/lib/i18n/dictionaries";
import { IconTicket } from "./icons";

/** Mandatory "single entry only" notice — shown on home, pricing, order form and payment page. */
export function SingleEntryNotice({ t, compact = false }: { t: Dict; compact?: boolean }) {
  if (compact) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-accent-600/20 bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700">
        <IconTicket className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong className="font-semibold">{t.singleEntry.title}.</strong> {t.singleEntry.short}
        </span>
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-accent-600/20 bg-accent-50 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 text-accent-700">
        <IconTicket className="size-5" />
        <h3 className="text-sm font-bold uppercase tracking-wide">{t.singleEntry.title}</h3>
      </div>
      <ul className="mt-3 grid gap-1.5 text-sm text-navy-800 sm:grid-cols-2">
        {t.singleEntry.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-600" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
