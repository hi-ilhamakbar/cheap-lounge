import { getDict } from "@/lib/i18n/server";
import { Notice } from "@/components/Notice";
import { whatsappLink } from "@/components/WhatsAppFloat";

export default async function TrackPage() {
  const { t } = await getDict();
  return (
    <div className="container-page max-w-xl py-16">
      <h1 className="heading-display text-3xl">{t.track.title}</h1>
      <div className="mt-6">
        <Notice>
          <p>{t.track.body}</p>
          <a className="font-semibold underline" href={whatsappLink(t.support.waMessage)} target="_blank" rel="noopener noreferrer">
            {t.support.button}
          </a>
        </Notice>
      </div>
    </div>
  );
}
