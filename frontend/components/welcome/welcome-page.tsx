"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { WelcomeBackdrop } from "@/components/welcome/welcome-backdrop";
import { WelcomeNav } from "@/components/welcome/welcome-nav";
import { WelcomeTimelineScene } from "@/components/welcome/welcome-timeline-scene";

export function WelcomePage() {
  return (
    <motion.div
      className="relative min-h-screen overflow-hidden text-[var(--foreground)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <WelcomeBackdrop />
      <WelcomeNav />

      <main className="relative z-10 flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center px-5 pb-16 pt-2 sm:px-8">
        <div className="mx-auto w-full max-w-3xl text-center">
          <motion.p
            className="mb-5 inline-block rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)] backdrop-blur-[2px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            Simulation for fairer hiring
          </motion.p>

          <motion.h1
            className="text-[2.25rem] font-semibold leading-[1.15] tracking-tight sm:text-5xl md:text-[3.25rem]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
          >
            <span className="text-[var(--foreground)]">Equal skills.</span>
            <br />
            <span className="text-[var(--accent)]">Different paths.</span>
          </motion.h1>

          <WelcomeTimelineScene />

          <motion.p
            className="mx-auto max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-[17px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            Parallel simulates how invisible biases shape hiring outcomes—in
            real time—across parallel candidate timelines.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            <Link
              href="/profile"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--pastel-pink)] px-7 py-3 text-sm font-medium text-[var(--on-primary)] transition hover:bg-[var(--pastel-rose)] sm:w-auto"
            >
              Start a simulation
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/profile?mode=upload"
              className="text-sm text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
            >
              Upload resume instead
            </Link>
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
}
