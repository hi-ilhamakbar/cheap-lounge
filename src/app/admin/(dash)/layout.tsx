import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { providerMode } from "@/lib/lounges/service";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const mode = providerMode();
  return (
    <div className="min-h-dvh bg-navy-50/60">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-extrabold tracking-[0.08em]">JTM ADMIN</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-navy-700 hover:text-navy-900">Orders</Link>
              {mode === "database" && <Link href="/admin/lounges" className="text-navy-700 hover:text-navy-900">Lounges</Link>}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{admin.email}</span>
            <form action={logoutAction}><button className="btn-ghost px-3 py-1.5 text-xs">Sign out</button></form>
          </div>
        </div>
      </header>
      {mode === "none" && (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Lounge data source not configured — customers cannot select lounges. Set LOUNGE_PROVIDER and LoungeKey credentials (see README).
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
