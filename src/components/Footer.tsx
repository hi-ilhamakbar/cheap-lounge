import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { QRIS, WHATSAPP_DISPLAY, INTERNAL_CC_EMAILS } from "@/lib/business";
import { Logo } from "./Logo";
import { whatsappLink } from "./WhatsAppFloat";

export async function Footer() {
  const { t } = await getDict();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-navy-950 text-navy-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-sm text-sm leading-relaxed text-slate-300">{t.footer.tagline}</p>
          <p className="text-xs text-slate-400">QRIS NMID {QRIS.nmid}</p>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white">{t.footer.links}</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/#how">{t.nav.howItWorks}</Link></li>
            <li><Link className="hover:text-white" href="/#pricing">{t.nav.pricing}</Link></li>
            <li><Link className="hover:text-white" href="/#faq">{t.nav.faq}</Link></li>
            <li><Link className="hover:text-white" href="/track">{t.footer.trackOrder}</Link></li>
            <li><Link className="hover:text-white" href="/terms">{t.footer.terms}</Link></li>
            <li><Link className="hover:text-white" href="/privacy">{t.footer.privacy}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white">{t.footer.contact}</h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a className="hover:text-white" href={whatsappLink(t.support.waMessage)} target="_blank" rel="noopener noreferrer">
                WhatsApp {WHATSAPP_DISPLAY}
              </a>
            </li>
            {INTERNAL_CC_EMAILS.map((e) => (
              <li key={e}><a className="break-all hover:text-white" href={`mailto:${e}`}>{e}</a></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {year} JASA TIKET MURAH. {t.footer.rights}</p>
          <p className="max-w-xl md:text-right">{t.footer.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
