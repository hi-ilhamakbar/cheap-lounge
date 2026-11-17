import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-dvh place-items-center bg-navy-50 px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="text-xs font-extrabold tracking-[0.12em] text-navy-900">JASA TIKET MURAH</p>
        <h1 className="mt-1 text-xl font-semibold">Admin sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}
