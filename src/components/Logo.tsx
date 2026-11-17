import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="JASA TIKET MURAH — home">
      <span className={`grid size-9 place-items-center rounded-xl ${light ? "bg-white text-navy-900" : "bg-navy-900 text-white"} shadow-sm`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 18h16M6 18V9a6 6 0 0 1 12 0v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="9" r="1.6" fill="#d62f37" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`block text-[13px] font-extrabold tracking-[0.08em] ${light ? "text-white" : "text-navy-900"}`}>JASA TIKET MURAH</span>
        <span className={`block pt-1 text-[11px] font-medium tracking-wide ${light ? "text-navy-100" : "text-slate-500"}`}>Airport Lounge Voucher</span>
      </span>
    </Link>
  );
}
