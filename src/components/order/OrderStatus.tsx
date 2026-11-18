"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { StatusBadge } from "../StatusBadge";
import { IconCheck } from "../icons";

export const proofKey = (code: string) => `clv-proof-sent-${code}`;
export const PROOF_EVENT = "clv-proof-sent";

/**
 * Without a database the site cannot know whether staff verified a payment; it shows the steps the
 * customer has completed in this browser, and verification happens by email/WhatsApp.
 */
export function OrderStatus({ orderCode }: { orderCode: string }) {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setSent(localStorage.getItem(proofKey(orderCode)) === "1");
      } catch {}
    };
    read();
    window.addEventListener(PROOF_EVENT, read);
    return () => window.removeEventListener(PROOF_EVENT, read);
  }, [orderCode]);

  const status = sent ? "PAYMENT_SUBMITTED" : "PENDING_PAYMENT";
  const steps = [t.order.stepCreated, t.order.stepProof, t.order.stepVerify];
  const done = sent ? 2 : 1;
  return (
    <div className="card p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t.order.timeline}</h2>
        <StatusBadge status={status} label={t.status[status]} />
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className={`grid size-6 place-items-center rounded-full text-xs ${i < done ? "bg-navy-900 text-white" : i === done ? "bg-accent-600 text-white" : "bg-navy-100 text-slate-400"}`}>
              {i < done ? <IconCheck className="size-3.5" /> : i + 1}
            </span>
            <span className={i <= done ? "font-medium text-navy-900" : "text-slate-400"}>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500">{t.order.verifyNote}</p>
    </div>
  );
}
