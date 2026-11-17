"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <h1 className="heading-display text-3xl">Terjadi kesalahan · Something went wrong</h1>
      <p className="mt-3 text-slate-600">
        Server sedang mengalami gangguan. Silakan coba lagi. · The server encountered an error. Please try again.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-navy mt-8">Coba lagi · Try again</button>
    </div>
  );
}
