"use client";

import { useEffect, useState } from "react";

import { fetchInterventions } from "@/lib/api";

type InterventionControlsProps = {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  isReplay: boolean;
  onReplayChange: (v: boolean) => void;
};

export function InterventionControls({
  selected,
  onChange,
  disabled,
  isReplay,
  onReplayChange,
}: InterventionControlsProps) {
  const [options, setOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInterventions().then(setOptions);
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        Interventions
      </h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Replay with structural fixes to reduce divergence
      </p>
      <ul className="mt-3 space-y-2">
        {Object.entries(options).map(([id, label]) => (
          <li key={id}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => toggle(id)}
                disabled={disabled}
                className="mt-0.5 rounded border-[var(--border)]"
              />
              <span className="text-[var(--muted)] leading-snug">{label}</span>
            </label>
          </li>
        ))}
        {Object.keys(options).length === 0 && (
          <li className="text-xs text-[var(--muted)]">Loading interventions…</li>
        )}
      </ul>
      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={isReplay}
          onChange={(e) => onReplayChange(e.target.checked)}
          disabled={disabled}
        />
        Mark as intervention replay
      </label>
    </section>
  );
}
