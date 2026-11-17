import { NextResponse, type NextRequest } from "next/server";
import { submitPaymentProof, OrderError } from "@/lib/orders";
import { jsonError, rateLimitOr429 } from "@/lib/http";
import { sanitizeText } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderCode: string }> }) {
  const limited = await rateLimitOr429("payment-proof", 8, 600);
  if (limited) return limited;
  const { orderCode } = await params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "errors.fileRequired");
  }
  const file = form.get("file");
  const token = String(form.get("token") ?? "");
  if (!(file instanceof File)) return jsonError(400, "errors.fileRequired", { fields: { file: "errors.fileRequired" } });
  try {
    await submitPaymentProof({
      orderCode,
      token,
      file,
      payerName: sanitizeText(String(form.get("payerName") ?? "")) || undefined,
      note: sanitizeText(String(form.get("note") ?? "")) || undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.status, e.key, e.field ? { fields: { [e.field]: e.key } } : undefined);
    logger.error("payment_proof_failed", { orderCode, error: e });
    return jsonError(500, "errors.server");
  }
}
