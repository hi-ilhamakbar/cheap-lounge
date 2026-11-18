"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { MAX_PROOF_BYTES, ALLOWED_PROOF_MIME } from "@/lib/business";
import { Notice } from "../Notice";
import { IconSpinner, IconUpload } from "../icons";
import { proofKey, PROOF_EVENT } from "./OrderStatus";

export function PaymentProofForm({ orderCode, token }: { orderCode: string; token: string }) {
  const { t, tk } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [again, setAgain] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(proofKey(orderCode)) === "1") setDone(true);
    } catch {}
  }, [orderCode]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError(t.errors.fileRequired);
    if (file.size > MAX_PROOF_BYTES) return setError(t.errors.fileTooLarge);
    if (file.type && !(ALLOWED_PROOF_MIME as readonly string[]).includes(file.type)) return setError(t.errors.fileType);

    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/payment-proof`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        try {
          localStorage.setItem(proofKey(orderCode), "1");
        } catch {}
        window.dispatchEvent(new Event(PROOF_EVENT));
        setDone(true);
        setAgain(false);
        setBusy(false);
        return;
      }
      setError(tk(data.error ?? "errors.server"));
    } catch {
      setError(t.errors.network);
    }
    setBusy(false);
  }

  if (done && !again)
    return (
      <div className="mt-4 space-y-3">
        <Notice>{t.order.proofSubmitted}</Notice>
        <button type="button" className="text-sm font-semibold text-navy-700 underline" onClick={() => setAgain(true)}>
          {t.order.sendAnother}
        </button>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4" encType="multipart/form-data">
      <div>
        <label htmlFor="proof" className="field-label">{t.order.proofFile} *</label>
        <label
          htmlFor="proof"
          className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-navy-100 px-4 py-5 text-sm text-slate-600 transition hover:border-navy-700/40"
        >
          <IconUpload className="size-5 text-navy-700" />
          <span className="truncate">{fileName ?? t.order.proofFile}</span>
        </label>
        <input
          ref={fileRef}
          id="proof"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </div>
      <div>
        <label htmlFor="payerName" className="field-label">{t.order.payerName}</label>
        <input id="payerName" name="payerName" className="field-input" maxLength={100} />
      </div>
      <div>
        <label htmlFor="note" className="field-label">{t.order.note}</label>
        <textarea id="note" name="note" rows={2} maxLength={500} className="field-input" />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <><IconSpinner className="size-4" /> {t.order.submittingProof}</> : t.order.submitProof}
      </button>
    </form>
  );
}
