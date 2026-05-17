"use client";

import Link from "next/link";

import { StepIndicator } from "@/components/flow/step-indicator";

type FlowShellProps = {
  children: React.ReactNode;
  showSteps?: boolean;
  minimal?: boolean;
};

export function FlowShell({
  children,
  showSteps = true,
  minimal = false,
}: FlowShellProps) {
  return (
    <div className="relative min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="relative z-20 border-b border-[var(--border)]/60 bg-[var(--background)]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              <span className="text-[var(--primary)]">//</span> PARALLEL
            </span>
          </Link>
          {!minimal && showSteps && <StepIndicator />}
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
