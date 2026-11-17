const STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-800 ring-amber-200",
  PAYMENT_SUBMITTED: "bg-sky-50 text-sky-800 ring-sky-200",
  PAYMENT_VERIFIED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PROCESSING: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  COMPLETED: "bg-navy-900 text-white ring-navy-900",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge ring-1 ${STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{label}</span>;
}
