import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { getLoungesForAirport } from "@/lib/lounges/service";
import { LoungeCard } from "@/components/LoungeCard";
import { Notice } from "@/components/Notice";
import { AirportSearch } from "@/components/AirportSearch";
import { whatsappLink } from "@/components/WhatsAppFloat";
import { IconChevronLeft } from "@/components/icons";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ iata: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { iata } = await params;
  return { title: `Lounges ${iata.toUpperCase()}` };
}

export default async function AirportLoungesPage({ params }: Props) {
  const { iata } = await params;
  const { t } = await getDict();
  let result: Awaited<ReturnType<typeof getLoungesForAirport>>;
  try {
    result = await getLoungesForAirport(iata);
  } catch (error) {
    logger.error("airport_page_failed", { iata, error });
    result = { status: "error", message: "unexpected" };
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <Link href="/#search" className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900">
        <IconChevronLeft className="size-4" /> {t.lounge.changeAirport}
      </Link>

      {result.status === "ok" ? (
        <>
          <header className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">{t.lounge.titleAt}</p>
              <h1 className="heading-display mt-2 text-3xl sm:text-4xl">
                {result.airport.name} <span className="text-slate-400">({result.airport.iata})</span>
              </h1>
              <p className="mt-2 text-slate-600">
                {[result.airport.city, result.airport.country].filter(Boolean).join(", ")} · {result.lounges.length} {t.lounge.found}
              </p>
            </div>
            <div className="w-full lg:max-w-md">
              <AirportSearch size="md" />
            </div>
          </header>
          <div className="mt-6">
            <Notice>{t.lounge.disclaimer}</Notice>
          </div>
          {result.lounges.length === 0 ? (
            <div className="mt-8">
              <Notice tone="warn">
                <p>{t.lounge.none}</p>
                <a className="font-semibold underline" href={whatsappLink(t.support.waMessage)} target="_blank" rel="noopener noreferrer">
                  {t.support.button}
                </a>
              </Notice>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.lounges.map((l) => (
                <LoungeCard key={l.id} lounge={l} t={t} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto mt-10 max-w-xl space-y-6">
          <AirportSearch size="md" />
          <Notice tone={result.status === "airport_not_found" ? "warn" : "error"}>
            <p>
              {result.status === "airport_not_found"
                ? t.lounge.airportNotFound
                : result.status === "not_configured"
                  ? t.lounge.unavailable
                  : t.lounge.error}
            </p>
            <p className="flex flex-wrap gap-4">
              {result.status === "error" && (
                <Link className="font-semibold underline" href={`/airports/${iata}`}>
                  {t.lounge.retry}
                </Link>
              )}
              <a className="font-semibold underline" href={whatsappLink(t.support.waMessage)} target="_blank" rel="noopener noreferrer">
                {t.support.button}
              </a>
            </p>
          </Notice>
        </div>
      )}
    </div>
  );
}
