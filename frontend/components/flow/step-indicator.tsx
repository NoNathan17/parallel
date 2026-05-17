"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/", label: "Welcome" },
  { href: "/profile", label: "Profile" },
  { href: "/variants", label: "Variants" },
  { href: "/simulate", label: "Simulation" },
  { href: "/analysis", label: "Analysis" },
] as const;

export function StepIndicator() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => {
    if (s.href === "/") return pathname === "/";
    return pathname.startsWith(s.href);
  });

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 sm:gap-2"
      aria-label="Progress"
    >
      {STEPS.map((step, i) => {
        const active = i === currentIndex;
        const done = currentIndex > i;
        return (
          <div key={step.href} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <span
                className={`hidden h-px w-4 sm:block sm:w-8 ${done ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
              />
            )}
            <Link
              href={step.href}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition sm:px-3 sm:text-xs ${
                active
                  ? "bg-[var(--pastel-pink)] text-[var(--on-primary)]"
                  : done
                    ? "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {step.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
