import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";

export async function Header() {
  const { t } = await getDict();
  const links = [
    { href: "/#how", label: t.nav.howItWorks },
    { href: "/#pricing", label: t.nav.pricing },
    { href: "/#faq", label: t.nav.faq },
    { href: "/#support", label: t.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/70 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-navy-700 transition hover:text-navy-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link href="/#search" className="btn-primary hidden px-4 py-2.5 sm:inline-flex">
            {t.nav.book}
          </Link>
        </div>
      </div>
    </header>
  );
}
