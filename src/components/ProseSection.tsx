export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { h: string; p: string[] }[] }) {
  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="heading-display text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{updated}</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-navy-900">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-2 leading-relaxed text-slate-700">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
