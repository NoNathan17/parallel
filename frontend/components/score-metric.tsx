type ScoreMetricProps = {
  label: string;
  value?: number;
  format?: "percent" | "score";
};

export function ScoreMetric({
  label,
  value,
  format = "score",
}: ScoreMetricProps) {
  if (value === undefined) return null;

  const display =
    format === "percent"
      ? `${Math.round(value * 100)}%`
      : value.toFixed(0);

  const pct =
    format === "percent" ? value * 100 : Math.min(100, Math.max(0, value));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--muted)]">{label}</span>
        <span className="font-mono font-medium text-[var(--foreground)]">
          {display}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${display}`}
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
