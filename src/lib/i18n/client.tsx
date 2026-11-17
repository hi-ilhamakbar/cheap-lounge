"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, dictionaries, translateKey, type Dict, type Lang } from "./dictionaries";

type Ctx = { lang: Lang; t: Dict; tk: (key: string) => string; setLang: (l: Lang) => void };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const router = useRouter();
  const t = dictionaries[lang];
  const setLang = useCallback(
    (l: Lang) => {
      // Persist for one year so the choice survives navigation and later visits.
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
      router.refresh();
    },
    [router],
  );
  const tk = useCallback((key: string) => translateKey(t, key), [t]);
  return <I18nContext.Provider value={{ lang, t, tk, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
