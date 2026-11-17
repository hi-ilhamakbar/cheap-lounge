import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, dictionaries, isLang, type Lang } from "./dictionaries";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
