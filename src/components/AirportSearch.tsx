"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import type { AirportInfo } from "@/lib/lounges/types";
import { IconMapPin, IconPlane, IconSearch, IconSpinner } from "./icons";

type Props = {
  onSelect?: (airport: AirportInfo) => void;
  size?: "lg" | "md";
  autoFocus?: boolean;
};

type State = "idle" | "loading" | "done" | "error";

export function AirportSearch({ onSelect, size = "lg", autoFocus }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AirportInfo[]>([]);
  const [state, setState] = useState<State>("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    setHint(null);
    if (q.length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setState("idle");
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState("loading");
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { ok: boolean; airports?: AirportInfo[] };
        if (!res.ok || !data.ok) throw new Error("search failed");
        setResults(data.airports ?? []);
        setActive(data.airports?.length ? 0 : -1);
        setState("done");
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setResults([]);
        setState("error");
        setOpen(true);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(a: AirportInfo) {
    setQuery(`${a.name} (${a.iata})`);
    setOpen(false);
    if (onSelect) onSelect(a);
    else router.push(`/airports/${a.iata}`);
  }

  function submit() {
    if (active >= 0 && results[active]) return choose(results[active]);
    const exact = results.find((r) => r.iata === query.trim().toUpperCase());
    if (exact) return choose(exact);
    if (results.length === 1) return choose(results[0]);
    setHint(query.trim().length < 2 ? t.search.minChars : t.search.selectFromList);
    setOpen(true);
  }

  const lg = size === "lg";

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`flex w-full items-center gap-2 rounded-2xl border border-navy-100 bg-white shadow-lift ${lg ? "p-2 sm:p-2.5" : "p-1.5"}`}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t.search.label}
        </label>
        <span className="pl-3 text-navy-700">
          {state === "loading" ? <IconSpinner className="size-5" /> : <IconSearch className="size-5" />}
        </span>
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={t.search.placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`min-w-0 flex-1 bg-transparent text-navy-900 placeholder:text-slate-400 focus:outline-none ${lg ? "py-3 text-base" : "py-2 text-sm"}`}
        />
        <button type="submit" className={`btn-primary shrink-0 ${lg ? "px-5 py-3 sm:px-6" : "px-4 py-2"}`}>
          <span className="hidden sm:inline">{t.search.button}</span>
          <IconSearch className="size-4 sm:hidden" />
        </button>
      </form>

      {open && (state !== "idle" || hint) && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift">
          {state === "loading" && results.length === 0 && (
            <p className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500" role="status">
              <IconSpinner className="size-4" /> {t.search.loading}
            </p>
          )}
          {state === "error" && (
            <p className="px-4 py-4 text-sm text-accent-600" role="alert">
              {t.search.failed}
            </p>
          )}
          {state === "done" && results.length === 0 && <p className="px-4 py-4 text-sm text-slate-500">{t.search.noResults}</p>}
          {hint && results.length > 0 && <p className="border-b border-navy-100 px-4 py-2.5 text-xs text-accent-600">{hint}</p>}
          {hint && state === "idle" && <p className="px-4 py-3 text-sm text-slate-500">{hint}</p>}
          {results.length > 0 && (
            <ul id={listId} role="listbox" className="max-h-80 overflow-auto py-1">
              {results.map((a, i) => (
                <li
                  key={a.iata}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(a);
                  }}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${i === active ? "bg-navy-50" : ""}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-xs font-bold tracking-wider text-white">
                    {a.iata}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-900">{a.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <IconMapPin className="size-3.5" />
                      {[a.city, a.country].filter(Boolean).join(", ")}
                    </span>
                  </span>
                  <IconPlane className="size-4 text-slate-300" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
