"use client";

import { useI18n } from "@/lib/i18n/client";
import type { Lang } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const options: { value: Lang; label: string; full: string }[] = [
    { value: "id", label: "ID", full: "Bahasa Indonesia" },
    { value: "en", label: "EN", full: "English" },
  ];
  return (
    <div role="group" aria-label={t.nav.language} className="inline-flex rounded-full border border-navy-100 bg-navy-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => o.value !== lang && setLang(o.value)}
          aria-pressed={lang === o.value}
          title={o.full}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            lang === o.value ? "bg-navy-900 text-white shadow-sm" : "text-navy-700 hover:text-navy-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
