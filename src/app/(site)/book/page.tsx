import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { getActiveLounge } from "@/lib/lounges/service";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking", robots: { index: false } };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ lounge?: string }> }) {
  const { lounge: loungeId } = await searchParams;
  const { t } = await getDict();
  const lounge = loungeId ? await getActiveLounge(loungeId) : null;
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="heading-display text-3xl sm:text-4xl">{t.booking.title}</h1>
      <div className="mt-8">
        <BookingWizard initialLounge={lounge} />
      </div>
    </div>
  );
}
