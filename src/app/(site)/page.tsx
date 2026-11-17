import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/pricing";
import { PRICES_IDR } from "@/lib/business";
import { AirportSearch } from "@/components/AirportSearch";
import { SingleEntryNotice } from "@/components/SingleEntryNotice";
import { whatsappLink } from "@/components/WhatsAppFloat";
import { IconCheck, IconChevronRight, IconMail, IconQr, IconSearch, IconShield, IconUsers, IconWhatsApp, IconPlane, IconChat } from "@/components/icons";

const POPULAR = [
  { iata: "CGK", city: "Jakarta", name: "Soekarno-Hatta" },
  { iata: "DPS", city: "Bali", name: "I Gusti Ngurah Rai" },
  { iata: "SIN", city: "Singapore", name: "Changi" },
  { iata: "KUL", city: "Kuala Lumpur", name: "KLIA" },
  { iata: "BKK", city: "Bangkok", name: "Suvarnabhumi" },
  { iata: "HKG", city: "Hong Kong", name: "Hong Kong Intl." },
  { iata: "NRT", city: "Tokyo", name: "Narita" },
  { iata: "DXB", city: "Dubai", name: "Dubai Intl." },
];

export default async function HomePage() {
  const { t, lang } = await getDict();
  const stepIcons = [IconSearch, IconPlane, IconUsers, IconQr];
  const whyIcons = [IconShield, IconQr, IconMail, IconChat];

  return (
    <>
      {/* HERO */}
      <section id="search" className="relative overflow-hidden scroll-mt-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,#e6eaf4_0%,transparent_60%),radial-gradient(40rem_20rem_at_0%_110%,#fdf1f2_0%,transparent_60%)]" />
        <div className="container-page relative grid items-center gap-12 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div>
            <span className="badge border border-navy-100 bg-white text-navy-700 shadow-sm">
              <span className="size-1.5 rounded-full bg-accent-600" /> {t.hero.badge}
            </span>
            <h1 className="heading-display mt-6 text-4xl leading-[1.08] sm:text-5xl lg:text-[3.6rem]">{t.hero.title}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{t.hero.subtitle}</p>
            <div className="mt-8 max-w-xl">
              <AirportSearch />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {t.hero.fromPrice} <strong className="text-navy-900">{formatIDR(PRICES_IDR.CHILD, lang)}</strong> {t.hero.perPerson} ·{" "}
              {t.singleEntry.short}
            </p>
          </div>

          {/* Decorative lounge "window" — pure CSS/SVG, no stock imagery */}
          <div aria-hidden className="relative hidden lg:block">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 shadow-lift">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,164,92,.35),transparent_45%)]" />
              <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="rw" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity=".18" />
                  </linearGradient>
                </defs>
                <path d="M120 500 L190 300 L210 300 L280 500 Z" fill="url(#rw)" />
                {[0, 1, 2, 3, 4].map((i) => (
                  <rect key={i} x="198" y={315 + i * 36} width="4" height={14 + i * 4} fill="#fff" opacity=".5" />
                ))}
                <path d="M60 300 H340" stroke="#fff" strokeOpacity=".15" />
                <g transform="translate(250 130) rotate(-12)" fill="#fff" opacity=".9">
                  <path d="M0 8 L70 6 L90 0 L96 4 L80 10 L96 16 L90 20 L70 14 L0 12 Z" />
                  <path d="M30 9 L18 -14 L26 -14 L50 9 Z M30 11 L18 34 L26 34 L50 11 Z" />
                </g>
              </svg>
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-navy-100">
                  <span>Lounge Voucher</span>
                  <span>QRIS</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-navy-100">{t.pricing.adult}</div>
                    <div className="text-2xl font-semibold">{formatIDR(PRICES_IDR.ADULT, lang)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-navy-100">{t.pricing.child}</div>
                    <div className="text-lg font-semibold">{formatIDR(PRICES_IDR.CHILD, lang)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="scroll-mt-20 bg-navy-50/60 py-20">
        <div className="container-page">
          <p className="eyebrow">{t.how.eyebrow}</p>
          <h2 className="heading-display mt-3 text-3xl sm:text-4xl">{t.how.title}</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.how.steps.map((s, i) => {
              const Icon = stepIcons[i];
              return (
                <li key={s.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-navy-900 text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-3xl font-semibold text-navy-100">0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 font-semibold text-navy-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* POPULAR AIRPORTS */}
      <section className="py-20">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{t.popular.eyebrow}</p>
              <h2 className="heading-display mt-3 text-3xl sm:text-4xl">{t.popular.title}</h2>
              <p className="mt-3 max-w-xl text-slate-600">{t.popular.subtitle}</p>
            </div>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {POPULAR.map((a) => (
              <li key={a.iata}>
                <Link
                  href={`/airports/${a.iata}`}
                  className="group block overflow-hidden rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-navy-700/20 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl font-bold tracking-wider text-navy-900">{a.iata}</span>
                    <IconPlane className="size-5 text-accent-600 transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-6 font-semibold text-navy-900">{a.city}</p>
                  <p className="text-sm text-slate-500">{a.name}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-700">
                    {t.popular.view} <IconChevronRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-navy-900 py-20 text-white">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-500">{t.why.eyebrow}</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl">{t.why.title}</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.why.items.map((w, i) => {
              const Icon = whyIcons[i];
              return (
                <div key={w.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <Icon className="size-6 text-gold-500" />
                  <h3 className="mt-4 font-semibold">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{w.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-20 py-20">
        <div className="container-page">
          <p className="eyebrow">{t.pricing.eyebrow}</p>
          <h2 className="heading-display mt-3 text-3xl sm:text-4xl">{t.pricing.title}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              { label: t.pricing.adult, desc: t.pricing.adultDesc, price: PRICES_IDR.ADULT, featured: true },
              { label: t.pricing.child, desc: t.pricing.childDesc, price: PRICES_IDR.CHILD, featured: false },
            ].map((p) => (
              <div key={p.label} className={`card p-7 ${p.featured ? "ring-2 ring-navy-900" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{p.label}</h3>
                  <span className="badge bg-navy-50 text-navy-700">{p.desc}</span>
                </div>
                <p className="mt-5">
                  <span className="text-4xl font-bold tracking-tight">{formatIDR(p.price, lang)}</span>
                  <span className="ml-1 text-slate-500">{t.pricing.perVoucher}</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  {t.singleEntry.bullets.slice(0, 3).map((b) => (
                    <li key={b} className="flex gap-2">
                      <IconCheck className="mt-0.5 size-4 shrink-0 text-accent-600" /> {b}
                    </li>
                  ))}
                </ul>
                <Link href="/#search" className={`${p.featured ? "btn-navy" : "btn-ghost"} mt-7 w-full`}>
                  {t.pricing.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <SingleEntryNotice t={t} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-navy-50/60 py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">{t.faq.eyebrow}</p>
            <h2 className="heading-display mt-3 text-3xl sm:text-4xl">{t.faq.title}</h2>
          </div>
          <div className="space-y-3">
            {t.faq.items.map((f) => (
              <details key={f.q} className="group card p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900">
                  {f.q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section id="support" className="scroll-mt-20 py-20">
        <div className="container-page">
          <div className="flex flex-col items-start gap-6 rounded-3xl bg-gradient-to-br from-navy-900 to-navy-800 p-8 text-white shadow-lift sm:p-12 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-500">{t.support.eyebrow}</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">{t.support.title}</h2>
              <p className="mt-3 text-slate-300">{t.support.body}</p>
            </div>
            <a href={whatsappLink(t.support.waMessage)} target="_blank" rel="noopener noreferrer" className="btn bg-[#1fa855] px-6 text-white hover:bg-[#178c46]">
              <IconWhatsApp className="size-5" /> {t.support.button}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
