export const VARIANT_STYLES: Record<
  string,
  { badge: string; border: string; dot: string }
> = {
  Baseline: {
    badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    border: "border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  "Nontraditional Background": {
    badge: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    border: "border-amber-500/25",
    dot: "bg-amber-400",
  },
  "No Referral": {
    badge: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    border: "border-orange-500/25",
    dot: "bg-orange-400",
  },
  "ESL Communication Style": {
    badge: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    border: "border-violet-500/25",
    dot: "bg-violet-400",
  },
};

export function variantStyle(variant?: string) {
  return (
    VARIANT_STYLES[variant ?? ""] ?? {
      badge: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
      border: "border-slate-500/25",
      dot: "bg-slate-400",
    }
  );
}
