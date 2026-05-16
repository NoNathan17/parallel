import { VARIANTS } from "@/lib/variants";

export function VariantsGuide() {
  return (
    <section className="card-glow rounded-xl p-4" aria-labelledby="variants-heading">
      <h2 id="variants-heading" className="text-sm font-semibold">
        Inclusivity variants
      </h2>

      <p className="mt-1 text-xs text-[var(--muted)]">
        Four identical resumes. Only inclusivity signals change.
      </p>

      <ol className="mt-3 grid gap-2 lg:grid-cols-2">
        {VARIANTS.map((v, i) => (
          <li
            key={v.name}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/80 px-3 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--muted)] ring-1 ring-[var(--border)]">
              {i + 1}
            </span>

            <span className="min-w-0 text-sm font-medium leading-snug text-[var(--foreground)]">
              {v.name}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}