"use client";

import type { InterventionFlags } from "@/lib/types";

interface Props {
  flags: InterventionFlags;
  onChange: (flags: InterventionFlags) => void;
  onReplay: () => void;
  disabled: boolean;
  loading: boolean;
}

const OPTIONS: { key: keyof InterventionFlags; label: string }[] = [
  { key: "blind_screening", label: "Blind screening" },
  { key: "structured_rubric", label: "Structured rubric" },
  { key: "hidden_recruiter_notes", label: "Hidden recruiter notes" },
  { key: "standardized_questions", label: "Standardized questions" },
];

export function InterventionBar({ flags, onChange, onReplay, disabled, loading }: Props) {
  return (
    <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
      <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-500 mb-3">
        Interventions
      </h3>
      <p className="text-xs text-zinc-500 mb-3">
        Enable structural fixes, then replay to watch branches shrink.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {OPTIONS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs cursor-pointer hover:border-emerald-600"
          >
            <input
              type="checkbox"
              checked={flags[key]}
              onChange={(e) => onChange({ ...flags, [key]: e.target.checked })}
              className="accent-emerald-500"
            />
            {label}
          </label>
        ))}
      </div>
      <button
        onClick={onReplay}
        disabled={disabled || loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Replaying…" : "Replay with interventions"}
      </button>
    </div>
  );
}
