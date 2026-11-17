"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { adminChangeStatus, adminRejectPayment, adminResendEmail, adminVerifyPayment, OrderError } from "@/lib/orders";
import { isOrderStatus } from "@/lib/order-status";
import { sanitizeText } from "@/lib/validation";
import { logger } from "@/lib/logger";

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

// A real hash so failed lookups take the same time as wrong passwords (no user enumeration).
let dummyHash: Promise<string> | null = null;

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(`admin-login-ip:${ip}`, 10, 900),
    checkRateLimit(`admin-login-email:${email}`, 10, 900),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return { error: "Too many attempts. Try again in 15 minutes." };

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  dummyHash ??= hashPassword("not-a-real-password");
  const ok = admin?.active ? await verifyPassword(password, admin.passwordHash) : (await verifyPassword(password, await dummyHash), false);
  if (!admin || !ok) {
    logger.warn("admin_login_failed", { email, ip });
    return { error: "Invalid email or password." };
  }
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession(admin.id);
  logger.info("admin_login", { adminId: admin.id, ip });
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

function fail(e: unknown): ActionState {
  if (e instanceof OrderError) return { error: e.key.startsWith("errors.") ? "Action failed." : e.message };
  logger.error("admin_action_failed", { error: e });
  return { error: "Unexpected server error. Check logs." };
}

export async function verifyPaymentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const paymentId = String(fd.get("paymentId") ?? "");
  const orderId = String(fd.get("orderId") ?? "");
  try {
    await adminVerifyPayment(paymentId, admin.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Payment verified. Customer notified by email." };
}

export async function rejectPaymentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const paymentId = String(fd.get("paymentId") ?? "");
  const orderId = String(fd.get("orderId") ?? "");
  const reason = sanitizeText(String(fd.get("reason") ?? ""));
  if (reason.length < 3) return { error: "Please give a reason (shown to the customer)." };
  try {
    await adminRejectPayment(paymentId, reason, admin.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Payment rejected. Order returned to Pending Payment; customer notified." };
}

export async function changeStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(fd.get("orderId") ?? "");
  const to = String(fd.get("status") ?? "");
  const note = sanitizeText(String(fd.get("note") ?? "")) || undefined;
  if (!isOrderStatus(to)) return { error: "Invalid status." };
  try {
    await adminChangeStatus(orderId, to, note, admin.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Status updated." };
}

const EMAIL_TYPES = ["ORDER_CONFIRMATION", "PAYMENT_VERIFIED", "PAYMENT_REJECTED", "ORDER_COMPLETED"] as const;

export async function resendEmailAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const orderId = String(fd.get("orderId") ?? "");
  const type = String(fd.get("type") ?? "");
  if (!(EMAIL_TYPES as readonly string[]).includes(type)) return { error: "Invalid email type." };
  try {
    await adminResendEmail(orderId, type as (typeof EMAIL_TYPES)[number], admin.id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Email resend attempted — see delivery status below." };
}

// ── Manually maintained lounges (LOUNGE_PROVIDER=database) ───────────────

const loungeSchema = z.object({
  id: z.string().optional(),
  airportIata: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Airport must be a 3-letter IATA code"),
  externalId: z.string().trim().min(1, "LoungeKey reference is required").max(100),
  name: z.string().trim().min(2).max(200),
  terminal: z.string().trim().max(100).optional(),
  location: z.string().trim().max(300).optional(),
  openingHours: z.string().trim().max(500).optional(),
  description: z.string().trim().max(3000).optional(),
  facilities: z.string().trim().max(1000).optional(),
  images: z.string().trim().max(3000).optional(),
  conditions: z.string().trim().max(3000).optional(),
  accessInfo: z.string().trim().max(1000).optional(),
});

const orNull = (s?: string) => (s && s.length ? s : null);

export async function saveLoungeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = loungeSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const v = parsed.data;
  const airport = await prisma.airport.findUnique({ where: { iata: v.airportIata } });
  if (!airport) return { error: `Airport ${v.airportIata} is not in the airport table. Add it to prisma/airports-data.ts and re-seed.` };
  const data = {
    airportIata: v.airportIata,
    externalId: v.externalId,
    name: v.name,
    terminal: orNull(v.terminal),
    location: orNull(v.location),
    openingHours: orNull(v.openingHours),
    description: orNull(v.description),
    facilities: (v.facilities ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    images: (v.images ?? "").split(/\s+/).map((s) => s.trim()).filter((u) => /^https:\/\//.test(u)),
    conditions: orNull(v.conditions),
    accessInfo: orNull(v.accessInfo),
    syncedAt: new Date(),
  };
  try {
    if (v.id) await prisma.lounge.update({ where: { id: v.id, source: "MANUAL" }, data });
    else await prisma.lounge.create({ data: { ...data, source: "MANUAL" } });
  } catch (e) {
    return { error: e instanceof Error && e.message.includes("Unique") ? "A lounge with that LoungeKey reference already exists." : "Could not save lounge." };
  }
  revalidatePath("/admin/lounges");
  return { ok: true, message: "Lounge saved." };
}

export async function toggleLoungeAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const l = await prisma.lounge.findUnique({ where: { id } });
  if (l && l.source === "MANUAL") await prisma.lounge.update({ where: { id }, data: { active: !l.active } });
  revalidatePath("/admin/lounges");
}
