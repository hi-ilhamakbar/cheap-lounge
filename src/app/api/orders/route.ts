import { NextResponse, type NextRequest } from "next/server";
import { createOrderSchema, issuesToFieldErrors } from "@/lib/validation";
import { createOrder, OrderError } from "@/lib/orders";
import { jsonError, rateLimitOr429 } from "@/lib/http";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimitOr429("create-order", 10, 600);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "errors.generic");
  }
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "errors.fixFields", { fields: issuesToFieldErrors(parsed.error) });
  }
  try {
    const result = await createOrder(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) {
      return jsonError(e.status, e.key, e.field ? { fields: { [e.field]: e.key } } : undefined);
    }
    logger.error("order_create_failed", { error: e });
    return jsonError(500, "errors.server");
  }
}
