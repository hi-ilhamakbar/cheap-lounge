"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Hides its children while any element marked [data-no-overlay] (the QRIS code) is visible,
 * so the floating WhatsApp button never covers the QR pattern.
 */
export function FloatAvoider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const targets = document.querySelectorAll("[data-no-overlay]");
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));
      setHidden(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return (
    <div aria-hidden={hidden || undefined} className={`transition-opacity duration-200 ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      {children}
    </div>
  );
}
