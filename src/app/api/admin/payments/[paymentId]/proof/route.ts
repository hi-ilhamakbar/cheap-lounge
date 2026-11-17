import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Streams an uploaded payment proof to authenticated admins only. */
export async function GET(_req: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const { paymentId } = await params;
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { proofData: true, proofMime: true, proofFilename: true },
  });
  if (!p) return NextResponse.json({ ok: false }, { status: 404 });
  return new NextResponse(new Uint8Array(p.proofData), {
    headers: {
      "Content-Type": p.proofMime,
      "Content-Disposition": `inline; filename="${p.proofFilename}"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
