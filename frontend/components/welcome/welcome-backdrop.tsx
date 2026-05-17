"use client";

import { motion } from "framer-motion";

/** Page-level pastel atmosphere — branches live in WelcomeTimelineScene */
export function WelcomeBackdrop() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 75% 55% at 50% 42%, rgba(255, 200, 221, 0.32), transparent 68%)",
            "radial-gradient(ellipse 45% 40% at 88% 12%, rgba(162, 210, 255, 0.26), transparent 55%)",
            "radial-gradient(ellipse 40% 38% at 8% 78%, rgba(205, 180, 219, 0.22), transparent 52%)",
            "radial-gradient(ellipse 35% 30% at 72% 88%, rgba(189, 224, 254, 0.2), transparent 50%)",
            "var(--background)",
          ].join(", "),
        }}
      />

      {/* Deeper pool behind the singularity */}
      <div
        className="absolute left-1/2 top-[46%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-64 sm:w-64"
        style={{
          background:
            "radial-gradient(circle, rgba(205, 180, 219, 0.18) 0%, rgba(18, 17, 24, 0.04) 45%, transparent 70%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 48%, transparent 30%, var(--background) 100%)",
          opacity: 0.5,
        }}
      />
    </motion.div>
  );
}
