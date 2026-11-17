import { getDict } from "@/lib/i18n/server";
import { WHATSAPP_URL } from "@/lib/business";
import { IconWhatsApp } from "./icons";
import { FloatAvoider } from "./FloatAvoider";

export function whatsappLink(message: string) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

export async function WhatsAppFloat() {
  const { t } = await getDict();
  return (
    <FloatAvoider>
    <a
      href={whatsappLink(t.support.waMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.support.floatingLabel}
      className="group fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#1fa855] p-3.5 text-white shadow-lift transition hover:bg-[#178c46] sm:bottom-6 sm:right-6"
    >
      <IconWhatsApp className="size-6" />
      <span className="hidden pr-1 text-sm font-semibold lg:inline">{t.support.floatingLabel}</span>
    </a>
    </FloatAvoider>
  );
}
