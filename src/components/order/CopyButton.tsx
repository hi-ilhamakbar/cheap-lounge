"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "../icons";

export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older mobile browsers
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className="btn-ghost px-4 py-2" aria-live="polite">
      {copied ? <IconCheck className="size-4 text-green-600" /> : <IconCopy className="size-4" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
