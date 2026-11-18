import { NextResponse } from "next/server";
import { providerMode } from "@/lib/lounges/service";
import { emailProvider } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/** Reports which integrations are configured — never secret values. */
export async function GET() {
  const email = emailProvider();
  const orderSecret = (process.env.ORDER_SECRET ?? "").length >= 32 ? "configured" : "not_configured";
  const ok = email !== "none" && orderSecret === "configured" && providerMode() !== "none";
  return NextResponse.json({ ok, loungeProvider: providerMode(), email, orderSecret }, { status: ok ? 200 : 503 });
}
