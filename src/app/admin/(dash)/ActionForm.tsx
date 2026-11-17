"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "../actions";

/** Small wrapper around a server action form with pending state, confirmation and result message. */
export function ActionForm({
  action,
  submitLabel,
  children,
  confirm,
  tone = "primary",
  small = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children?: ReactNode;
  confirm?: string;
  tone?: "primary" | "danger";
  small?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="grid gap-2"
    >
      {children}
      <button
        disabled={pending}
        className={`${tone === "danger" ? "btn border border-accent-600/30 bg-white text-accent-700 hover:bg-accent-50" : "btn-navy"} ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2"}`}
      >
        {pending ? "Working…" : submitLabel}
      </button>
      {state?.error && <p className="text-xs text-accent-700" role="alert">{state.error}</p>}
      {state?.ok && state.message && <p className="text-xs text-emerald-700">{state.message}</p>}
    </form>
  );
}
