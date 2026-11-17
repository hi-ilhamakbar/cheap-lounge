import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../db";

export const ADMIN_COOKIE = "clv_admin";

function sessionHours(): number {
  const h = Number(process.env.ADMIN_SESSION_HOURS ?? 12);
  return Number.isFinite(h) && h > 0 && h <= 168 ? h : 12;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Creates a DB session (only the token hash is stored) and sets an httpOnly cookie. */
export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionHours() * 3600_000);
  const h = await headers();
  await prisma.adminSession.create({
    data: {
      tokenHash: sha256(token),
      adminId,
      expiresAt,
      ip: (h.get("x-forwarded-for")?.split(",")[0] ?? "").slice(0, 64) || null,
      userAgent: (h.get("user-agent") ?? "").slice(0, 300) || null,
    },
  });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(ADMIN_COOKIE);
}

export type AdminIdentity = { id: string; email: string; name: string };

export async function getAdmin(): Promise<AdminIdentity | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: { select: { id: true, email: true, name: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.admin.active) return null;
  return { id: session.admin.id, email: session.admin.email, name: session.admin.name };
}

/** For admin pages & server actions: redirects to login when not authenticated. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
