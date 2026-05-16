type LandingPanelProps = {
  apiOk: boolean | null;
};

export function LandingPanel({ apiOk }: LandingPanelProps) {
  return (
    <section
      className="card-glow relative overflow-hidden rounded-2xl px-6 py-10 sm:px-10 sm:py-12"
      aria-labelledby="landing-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--gradient-start)] via-transparent to-[var(--gradient-end)]"
        aria-hidden
      />
      <div className="relative">
        <p className="text-sm font-medium text-[var(--primary)]">
          Inclusivity hiring audit
        </p>
        <h2
          id="landing-heading"
          className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl"
        >
          Same resume. Different outcomes.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
          Parallel replays your profile through four inclusivity dimensions —{" "}
          <span className="text-[var(--foreground)]">gender</span>,{" "}
          <span className="text-[var(--foreground)]">race & ethnicity</span>, and{" "}
          <span className="text-[var(--foreground)]">socioeconomic background</span>{" "}
          — with identical skills. See where subjective scores diverge from technical
          parity.
        </p>

        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Upload your resume",
              body: ".txt or .pdf — the fastest way to start.",
            },
            {
              step: "2",
              title: "Set the target role",
              body: "Used as context for every stage of the pipeline.",
            },
            {
              step: "3",
              title: "Run simulation",
              body: "Stream the timeline, then read the bias auditor summary.",
            },
          ].map((item) => (
            <li
              key={item.step}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-4"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]"
                aria-hidden
              >
                {item.step}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                {item.body}
              </p>
            </li>
          ))}
        </ol>

        {apiOk === false && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-500/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]"
          >
            Backend is not reachable. Start it with{" "}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
              uvicorn app.main:app --reload --port 8000
            </code>{" "}
            from <code className="font-mono text-xs">backend</code>, then refresh.
          </p>
        )}
      </div>
    </section>
  );
}
