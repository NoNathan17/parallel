"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { href: "/profile", label: "How it works" },
  { href: "/variants", label: "Variants" },
  { href: "/simulate", label: "Simulation" },
] as const;

export function WelcomeNav() {
  return (
    <header className="relative z-20">
      <motion.nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="shrink-0 text-[15px] font-semibold tracking-tight text-[var(--foreground)]"
        >
          <span className="text-[var(--muted)]">//</span> Parallel
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[13px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/profile"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--pastel-pink)] px-5 py-2.5 text-[13px] font-medium text-[var(--on-primary)] transition hover:bg-[var(--pastel-rose)]"
        >
          Get started
          <span aria-hidden className="text-[var(--muted)]">
            →
          </span>
        </Link>
      </motion.nav>
    </header>
  );
}
