"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/dictionaries";
import { calculatePrice, formatIDR } from "@/lib/pricing";
import { bookingWindow, formatVisitDate, isWithinBookingWindow, toLocalISODate } from "@/lib/dates";
import { MAX_PASSENGERS_PER_TYPE } from "@/lib/business";
import { emailSchema, passengerNameSchema, whatsappSchema } from "@/lib/validation";
import type { AirportInfo, LoungeView } from "@/lib/lounges/types";
import { AirportSearch } from "../AirportSearch";
import { SingleEntryNotice } from "../SingleEntryNotice";
import { Notice } from "../Notice";
import { IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconMapPin, IconSpinner } from "../icons";

type LoungeWithAirport = LoungeView & { airport: AirportInfo };

type Form = {
  airport: AirportInfo | null;
  lounge: LoungeView | null;
  visitDate: string;
  customerName: string;
  whatsapp: string;
  email: string;
  adultQty: number;
  childQty: number;
  adultNames: string[];
  childNames: string[];
  acceptTerms: boolean;
};

type Errors = Record<string, string>;

const DRAFT_KEY = "clv-booking-draft-v1";
const STEP_FIELDS: string[][] = [
  ["airportIata", "loungeId"],
  ["visitDate"],
  ["whatsapp", "email", "customerName"],
  ["adultQty", "childQty", "adultNames", "childNames"],
  ["acceptTerms"],
];

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function BookingWizard({ initialLounge }: { initialLounge: LoungeWithAirport | null }) {
  const { t, tk, lang } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [today, setToday] = useState(() => toLocalISODate(new Date()));
  const [form, setForm] = useState<Form>({
    airport: initialLounge?.airport ?? null,
    lounge: initialLounge ?? null,
    visitDate: "",
    customerName: "",
    whatsapp: "+62 ",
    email: "",
    adultQty: 1,
    childQty: 0,
    adultNames: [""],
    childNames: [],
    acceptTerms: false,
  });

  // Lounge list for "change lounge" flow
  const [lounges, setLounges] = useState<LoungeView[] | null>(null);
  const [loungeState, setLoungeState] = useState<"idle" | "loading" | "error" | "unavailable">("idle");

  // Idempotency: the same payload re-submitted (double click, refresh, retry) maps to one order.
  const idem = useRef<{ key: string; payload: string } | null>(null);

  // Restore a draft (sessionStorage only — cleared when the tab closes).
  useEffect(() => {
    setToday(toLocalISODate(new Date()));
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<Form>;
      setForm((f) => ({
        ...f,
        ...d,
        // A lounge passed in the URL wins over the draft.
        airport: initialLounge?.airport ?? d.airport ?? f.airport,
        lounge: initialLounge ?? d.lounge ?? f.lounge,
        acceptTerms: false,
      }));
    } catch {
      /* ignore corrupt draft */
    }
  }, [initialLounge]);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, acceptTerms: false }));
    } catch {
      /* storage unavailable (private mode) — fine */
    }
  }, [form]);

  const win = bookingWindow(today);
  const price = useMemo(() => {
    try {
      return calculatePrice(form.adultQty, form.childQty);
    } catch {
      return null;
    }
  }, [form.adultQty, form.childQty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function setQty(kind: "adult" | "child", qty: number) {
    const q = Math.max(0, Math.min(MAX_PASSENGERS_PER_TYPE, qty));
    setForm((f) => {
      const namesKey = kind === "adult" ? "adultNames" : "childNames";
      const names = [...f[namesKey]];
      while (names.length < q) names.push("");
      names.length = q;
      return { ...f, [kind === "adult" ? "adultQty" : "childQty"]: q, [namesKey]: names };
    });
  }

  async function loadLounges(a: AirportInfo) {
    setForm((f) => ({ ...f, airport: a, lounge: f.lounge?.airportIata === a.iata ? f.lounge : null }));
    setLounges(null);
    setLoungeState("loading");
    try {
      const res = await fetch(`/api/airports/${a.iata}/lounges`);
      const data = await res.json();
      if (res.status === 503 || data.status === "not_configured") return setLoungeState("unavailable");
      if (!res.ok || !data.ok) throw new Error();
      setLounges(data.lounges as LoungeView[]);
      setLoungeState("idle");
    } catch {
      setLoungeState("error");
    }
  }

  function validateStep(s: number): Errors {
    const e: Errors = {};
    if (s === 0) {
      if (!form.airport) e.airportIata = "errors.airportRequired";
      if (!form.lounge) e.loungeId = "errors.loungeRequired";
    }
    if (s === 1) {
      if (!form.visitDate) e.visitDate = "errors.dateRequired";
      else if (!isWithinBookingWindow(form.visitDate, today)) e.visitDate = "errors.dateOutOfRange";
    }
    if (s === 2) {
      const w = whatsappSchema.safeParse(form.whatsapp.replace(/^\+62\s*$/, ""));
      if (!w.success) e.whatsapp = w.error.issues[0].message;
      const m = emailSchema.safeParse(form.email);
      if (!m.success) e.email = m.error.issues[0].message;
    }
    if (s === 3) {
      if (form.adultQty + form.childQty < 1) e.adultQty = "errors.passengerRequired";
      form.adultNames.forEach((n, i) => {
        const r = passengerNameSchema.safeParse(n);
        if (!r.success) e[`adultNames.${i}`] = r.error.issues[0].message;
      });
      form.childNames.forEach((n, i) => {
        const r = passengerNameSchema.safeParse(n);
        if (!r.success) e[`childNames.${i}`] = r.error.issues[0].message;
      });
    }
    if (s === 4 && !form.acceptTerms) e.acceptTerms = "errors.termsRequired";
    return e;
  }

  function goNext() {
    const e = validateStep(step);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) {
      setFormError(t.errors.fixFields);
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goTo(s: number) {
    setErrors({});
    setFormError(null);
    setStep(s);
  }

  async function submit() {
    // Re-validate every step so nothing slips through via the "Edit" shortcuts.
    for (let s = 0; s <= 4; s++) {
      const e = validateStep(s);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        setFormError(t.errors.fixFields);
        return;
      }
    }
    const payload = {
      language: lang,
      customerName: form.customerName.trim() || undefined,
      email: form.email,
      whatsapp: form.whatsapp,
      airportIata: form.airport!.iata,
      loungeId: form.lounge!.id,
      visitDate: form.visitDate,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      adultQty: form.adultQty,
      childQty: form.childQty,
      adultNames: form.adultNames,
      childNames: form.childNames,
      acceptTerms: form.acceptTerms,
    };
    const payloadJson = JSON.stringify({ ...payload, tzOffsetMinutes: 0 });
    if (!idem.current || idem.current.payload !== payloadJson) idem.current = { key: newKey(), payload: payloadJson };

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: idem.current.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
        router.push(`/order/${data.orderCode}?d=${data.token}`);
        return; // keep the button disabled while navigating
      }
      const fields = (data.fields ?? {}) as Errors;
      setErrors(fields);
      setFormError(tk(data.error ?? "errors.server"));
      const firstStep = STEP_FIELDS.findIndex((fs) => Object.keys(fields).some((k) => fs.includes(k.split(".")[0])));
      if (firstStep >= 0) setStep(firstStep);
      if (fields.loungeId) set("lounge", null);
    } catch {
      setFormError(t.errors.network);
    }
    setSubmitting(false);
  }

  const err = (k: string) => (errors[k] ? <p className="field-error">{tk(errors[k])}</p> : null);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {/* Progress indicator */}
        <nav aria-label="Progress" className="mb-8">
          <p className="mb-3 text-sm text-slate-500">{fmt(t.booking.stepOf, { n: step + 1, total: 5 })}</p>
          <ol className="grid grid-cols-5 gap-2">
            {t.booking.steps.map((label, i) => (
              <li key={label}>
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-navy-900" : "bg-navy-100"}`} />
                <span
                  aria-current={i === step ? "step" : undefined}
                  className={`mt-2 hidden text-xs font-medium sm:block ${i === step ? "text-navy-900" : i < step ? "text-navy-700" : "text-slate-400"}`}
                >
                  {i < step && <IconCheck className="mr-1 inline size-3" />}
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </nav>

        <div className="card p-5 sm:p-8">
          {formError && (
            <div className="mb-6">
              <Notice tone="error">{formError}</Notice>
            </div>
          )}

          {/* STEP 0 — Airport & lounge */}
          {step === 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold">{t.booking.steps[0]}</h2>
              <div>
                <span className="field-label">{t.booking.airport}</span>
                {form.airport && (
                  <p className="mb-3 rounded-xl bg-navy-50 px-4 py-3 text-sm">
                    <strong>{form.airport.name}</strong> ({form.airport.iata}) · {[form.airport.city, form.airport.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <AirportSearch size="md" onSelect={loadLounges} />
                {err("airportIata")}
              </div>

              <div>
                <span className="field-label">{t.booking.lounge}</span>
                {form.lounge && !lounges && (
                  <div className="rounded-xl border-2 border-navy-900 p-4">
                    <p className="font-semibold">{form.lounge.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {form.lounge.terminal ? `${t.lounge.terminal} ${form.lounge.terminal}` : t.lounge.infoUnavailable}
                    </p>
                  </div>
                )}
                {loungeState === "loading" && (
                  <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
                    <IconSpinner className="size-4" /> {t.booking.loadingLounges}
                  </p>
                )}
                {loungeState === "error" && <Notice tone="error">{t.lounge.error}</Notice>}
                {loungeState === "unavailable" && <Notice tone="warn">{t.lounge.unavailable}</Notice>}
                {lounges && lounges.length === 0 && <Notice tone="warn">{t.lounge.none}</Notice>}
                {lounges && lounges.length > 0 && (
                  <div role="radiogroup" aria-label={t.booking.chooseLounge} className="grid gap-3">
                    {lounges.map((l) => {
                      const selected = form.lounge?.id === l.id;
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          key={l.id}
                          onClick={() => set("lounge", l)}
                          className={`rounded-xl border-2 p-4 text-left transition ${selected ? "border-navy-900 bg-navy-50" : "border-navy-100 hover:border-navy-700/40"}`}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="font-semibold">{l.name}</span>
                            {selected && <IconCheck className="size-5 text-accent-600" />}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <IconMapPin className="size-3.5" />
                              {l.terminal ? `${t.lounge.terminal} ${l.terminal}` : t.lounge.infoUnavailable}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="size-3.5" />
                              {l.openingHours?.split("\n")[0] ?? t.lounge.infoUnavailable}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!form.lounge && !lounges && loungeState === "idle" && <p className="text-sm text-slate-500">{t.booking.noLounge}</p>}
                {err("loungeId")}
              </div>
              <p className="text-xs text-slate-500">{t.lounge.disclaimer}</p>
            </section>
          )}

          {/* STEP 1 — Date */}
          {step === 1 && (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold">{t.booking.steps[1]}</h2>
              <div>
                <label htmlFor="visitDate" className="field-label">
                  {t.booking.visitDate}
                </label>
                <input
                  id="visitDate"
                  type="date"
                  className="field-input max-w-xs"
                  min={win.min}
                  max={win.max}
                  value={form.visitDate}
                  aria-invalid={!!errors.visitDate}
                  onChange={(e) => set("visitDate", e.target.value)}
                />
                <p className="field-hint">{t.booking.dateHint}</p>
                {form.visitDate && isWithinBookingWindow(form.visitDate, today) && (
                  <p className="mt-2 text-sm font-medium text-navy-800">{formatVisitDate(form.visitDate, lang)}</p>
                )}
                {err("visitDate")}
              </div>
            </section>
          )}

          {/* STEP 2 — Contact */}
          {step === 2 && (
            <section className="space-y-5">
              <h2 className="text-xl font-semibold">{t.booking.steps[2]}</h2>
              <div>
                <label htmlFor="whatsapp" className="field-label">
                  {t.booking.whatsapp} *
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="field-input"
                  value={form.whatsapp}
                  aria-invalid={!!errors.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="+62 812 3456 7890"
                />
                <p className="field-hint">{t.booking.whatsappHint}</p>
                {err("whatsapp")}
              </div>
              <div>
                <label htmlFor="email" className="field-label">
                  {t.booking.email} *
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="field-input"
                  value={form.email}
                  aria-invalid={!!errors.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="nama@email.com"
                />
                <p className="field-hint">{t.booking.emailHint}</p>
                {err("email")}
              </div>
              <div>
                <label htmlFor="customerName" className="field-label">
                  {t.booking.customerName}
                </label>
                <input
                  id="customerName"
                  type="text"
                  autoComplete="name"
                  className="field-input"
                  maxLength={100}
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                />
              </div>
            </section>
          )}

          {/* STEP 3 — Passengers */}
          {step === 3 && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold">{t.booking.steps[3]}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <QtyStepper label={t.booking.adults} hint={t.booking.adultsHint} value={form.adultQty} onChange={(q) => setQty("adult", q)} />
                <QtyStepper label={t.booking.children} hint={t.booking.childrenHint} value={form.childQty} onChange={(q) => setQty("child", q)} />
              </div>
              {err("adultQty")}

              <Notice>{t.booking.nameInstruction}</Notice>

              {form.adultQty > 0 && (
                <fieldset className="space-y-3">
                  <legend className="mb-1 text-xs font-bold tracking-[0.14em] text-navy-900">{t.booking.adultSection}</legend>
                  {form.adultNames.map((n, i) => (
                    <div key={`a${i}`}>
                      <label htmlFor={`adult-${i}`} className="field-label">
                        {fmt(t.booking.adultN, { n: i + 1 })} *
                      </label>
                      <input
                        id={`adult-${i}`}
                        className="field-input"
                        autoComplete="off"
                        maxLength={100}
                        value={n}
                        aria-invalid={!!errors[`adultNames.${i}`]}
                        onChange={(e) => {
                          const names = [...form.adultNames];
                          names[i] = e.target.value;
                          set("adultNames", names);
                        }}
                      />
                      {err(`adultNames.${i}`)}
                    </div>
                  ))}
                </fieldset>
              )}

              {form.childQty > 0 && (
                <fieldset className="space-y-3 rounded-2xl bg-navy-50/70 p-4">
                  <legend className="mb-1 px-1 text-xs font-bold tracking-[0.14em] text-accent-700">{t.booking.childSection}</legend>
                  <p className="text-xs text-slate-600">{t.booking.childrenHint}</p>
                  {form.childNames.map((n, i) => (
                    <div key={`c${i}`}>
                      <label htmlFor={`child-${i}`} className="field-label">
                        {fmt(t.booking.childN, { n: i + 1 })} *
                      </label>
                      <input
                        id={`child-${i}`}
                        className="field-input"
                        autoComplete="off"
                        maxLength={100}
                        value={n}
                        aria-invalid={!!errors[`childNames.${i}`]}
                        onChange={(e) => {
                          const names = [...form.childNames];
                          names[i] = e.target.value;
                          set("childNames", names);
                        }}
                      />
                      {err(`childNames.${i}`)}
                    </div>
                  ))}
                </fieldset>
              )}
              <SingleEntryNotice t={t} compact />
            </section>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && form.airport && form.lounge && price && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold">{t.booking.summary}</h2>
              <SummaryBlock title={t.booking.steps[0]} onEdit={() => goTo(0)} editLabel={t.booking.edit}>
                <Row label={t.booking.airport} value={`${form.airport.name} (${form.airport.iata})`} />
                <Row label={t.booking.lounge} value={form.lounge.name} />
                <Row label={t.lounge.terminal} value={form.lounge.terminal ?? t.lounge.infoUnavailable} />
              </SummaryBlock>
              <SummaryBlock title={t.booking.steps[1]} onEdit={() => goTo(1)} editLabel={t.booking.edit}>
                <Row label={t.booking.visitDate} value={formatVisitDate(form.visitDate, lang)} />
              </SummaryBlock>
              <SummaryBlock title={t.booking.contact} onEdit={() => goTo(2)} editLabel={t.booking.edit}>
                {form.customerName.trim() && <Row label={t.booking.customerName.replace(/ \(.*\)$/, "")} value={form.customerName} />}
                <Row label={t.booking.whatsapp} value={whatsappSchema.safeParse(form.whatsapp).data ?? form.whatsapp} />
                <Row label={t.booking.email} value={form.email.trim().toLowerCase()} />
              </SummaryBlock>
              <SummaryBlock title={t.booking.passengers} onEdit={() => goTo(3)} editLabel={t.booking.edit}>
                <Row label={t.booking.adults} value={String(form.adultQty)} />
                <Row label={t.booking.children} value={String(form.childQty)} />
                {form.adultNames.map((n, i) => (
                  <Row key={`ra${i}`} label={fmt(t.booking.adultN, { n: i + 1 }).split(" – ")[0]} value={n} />
                ))}
                {form.childNames.map((n, i) => (
                  <Row key={`rc${i}`} label={fmt(t.booking.childN, { n: i + 1 }).split(" – ")[0]} value={n} />
                ))}
              </SummaryBlock>

              <div className="rounded-2xl bg-navy-900 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-100">{t.booking.priceBreakdown}</p>
                <PriceLines price={price} lang={lang} t={t} dark />
              </div>

              <SingleEntryNotice t={t} />

              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-navy-900"
                  checked={form.acceptTerms}
                  aria-invalid={!!errors.acceptTerms}
                  onChange={(e) => set("acceptTerms", e.target.checked)}
                />
                <span>
                  {t.booking.terms}{" "}
                  <Link href="/terms" target="_blank" className="font-semibold underline">
                    {t.booking.termsLink}
                  </Link>
                  {t.booking.termsTail}
                </span>
              </label>
              {err("acceptTerms")}
            </section>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-navy-100 pt-6">
            {step > 0 ? (
              <button type="button" className="btn-ghost" onClick={() => goTo(step - 1)} disabled={submitting}>
                <IconChevronLeft className="size-4" /> {t.booking.back}
              </button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button type="button" className="btn-navy" onClick={goNext}>
                {t.booking.next} <IconChevronRight className="size-4" />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={submit} disabled={submitting || !form.acceptTerms}>
                {submitting ? (
                  <>
                    <IconSpinner className="size-4" /> {t.booking.submitting}
                  </>
                ) : (
                  t.booking.submit
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">{t.booking.summary}</p>
          <p className="mt-3 font-semibold">{form.lounge?.name ?? "—"}</p>
          <p className="text-sm text-slate-500">{form.airport ? `${form.airport.name} (${form.airport.iata})` : "—"}</p>
          {form.visitDate && <p className="mt-2 text-sm text-slate-600">{formatVisitDate(form.visitDate, lang)}</p>}
          {price && <PriceLines price={price} lang={lang} t={t} />}
          <p className="mt-4 text-xs text-slate-500">{t.singleEntry.short}</p>
        </div>
      </aside>
    </div>
  );
}

function QtyStepper({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-navy-100 p-4">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`${label} −`} className="grid size-9 place-items-center rounded-full border border-navy-100 text-lg disabled:opacity-40" disabled={value <= 0} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`${label} +`} className="grid size-9 place-items-center rounded-full border border-navy-100 text-lg disabled:opacity-40" disabled={value >= MAX_PASSENGERS_PER_TYPE} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

function SummaryBlock({ title, onEdit, editLabel, children }: { title: string; onEdit: () => void; editLabel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy-100 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-navy-700">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-accent-600 hover:underline">
          {editLabel}
        </button>
      </div>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 sm:grid-cols-[170px_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words font-medium text-navy-900">{value}</dd>
    </div>
  );
}

function PriceLines({
  price,
  lang,
  t,
  dark = false,
}: {
  price: ReturnType<typeof calculatePrice>;
  lang: "id" | "en";
  t: ReturnType<typeof useI18n>["t"];
  dark?: boolean;
}) {
  const muted = dark ? "text-navy-100" : "text-slate-600";
  return (
    <dl className="mt-4 space-y-2 text-sm">
      {price.adultQty > 0 && (
        <div className="flex justify-between gap-4">
          <dt className={muted}>
            {t.booking.adultLine} {price.adultQty} × {formatIDR(price.adultUnitPrice, lang)}
          </dt>
          <dd className="font-medium tabular-nums">{formatIDR(price.adultSubtotal, lang)}</dd>
        </div>
      )}
      {price.childQty > 0 && (
        <div className="flex justify-between gap-4">
          <dt className={muted}>
            {t.booking.childLine} {price.childQty} × {formatIDR(price.childUnitPrice, lang)}
          </dt>
          <dd className="font-medium tabular-nums">{formatIDR(price.childSubtotal, lang)}</dd>
        </div>
      )}
      <div className={`flex justify-between gap-4 border-t pt-3 ${dark ? "border-white/15" : "border-navy-100"}`}>
        <dt className="font-semibold">{t.booking.total}</dt>
        <dd className="text-lg font-bold tabular-nums">{formatIDR(price.totalAmount, lang)}</dd>
      </div>
    </dl>
  );
}
