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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-200">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
