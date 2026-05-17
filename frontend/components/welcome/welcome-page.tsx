"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { FlowShell } from "@/components/flow/flow-shell";
import { AnimatedTimelineBackground } from "@/components/welcome/animated-timeline-background";

export function WelcomePage() {
  return (
    <FlowShell minimal showSteps={false}>
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-16">
        <AnimatedTimelineBackground />

        <motion.div
          className="relative z-10 mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.p
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--primary)]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span aria-hidden>✦</span> AI simulation for fairer hiring
          </motion.p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-[var(--foreground)]">Equal skills.</span>
            <br />
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
              Different paths.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Parallel simulates how invisible biases and structural barriers shape
            hiring outcomes—in real time—across parallel candidate timelines.
          </p>

          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/profile"
              className="w-full rounded-xl bg-[var(--primary)] px-8 py-3.5 text-sm font-semibold text-[#0c0e14] transition hover:bg-[var(--primary-hover)] sm:w-auto"
            >
              Get started
            </Link>
            <Link
              href="/profile?mode=upload"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-8 py-3.5 text-sm font-medium text-[var(--foreground)] backdrop-blur transition hover:border-[var(--primary)] sm:w-auto"
            >
              Upload resume
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          className="relative z-10 mt-16 text-xs text-[var(--muted-light)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Watch timelines branch as agents evaluate equivalent qualifications
        </motion.p>
      </section>
    </FlowShell>
  );
}
