import type { ReactNode } from "react";
import { IconAlert, IconInfo } from "./icons";

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-navy-100 bg-navy-50 text-navy-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-accent-600/25 bg-accent-50 text-accent-700",
  }[tone];
  const Icon = tone === "info" ? IconInfo : IconAlert;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${styles}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-2">{children}</div>
    </div>
  );
}
