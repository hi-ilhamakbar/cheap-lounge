import { NextResponse } from "next/server";
import { providerMode } from "@/lib/lounges/service";

export const dynamic = "force-dynamic";

/** Reports which integrations are configured — never secret values. */
export async function GET() {
  const email = process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "not_configured";
  const orderSecret = (process.env.ORDER_SECRET ?? "").length >= 32 ? "configured" : "not_configured";
  const ok = email === "configured" && orderSecret === "configured" && providerMode() !== "none";
  return NextResponse.json({ ok, loungeProvider: providerMode(), email, orderSecret }, { status: ok ? 200 : 503 });
}
