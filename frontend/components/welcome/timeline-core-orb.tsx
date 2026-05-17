"use client";

import { motion } from "framer-motion";

const PARTICLES = [
  { x: "28%", y: "38%", size: 2, delay: 0 },
  { x: "62%", y: "32%", size: 1.5, delay: 0.4 },
  { x: "44%", y: "58%", size: 2.5, delay: 0.8 },
  { x: "72%", y: "52%", size: 1.5, delay: 1.2 },
  { x: "36%", y: "68%", size: 1, delay: 0.6 },
  { x: "54%", y: "42%", size: 1, delay: 1.5 },
  { x: "48%", y: "48%", size: 3, delay: 0.2 },
  { x: "58%", y: "64%", size: 1.5, delay: 1 },
] as const;

type TimelineCoreOrbProps = {
  className?: string;
};

/** Matte singularity disc — branches attach at its edge */
export function TimelineCoreOrb({ className = "" }: TimelineCoreOrbProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      role="img"
      aria-label="Timeline core — decision point where parallel paths emerge"
    >
      {/* Lilac aura */}
      <motion.div
        className="absolute inset-[-14px] rounded-full sm:inset-[-18px]"
        animate={{
          boxShadow: [
            "0 0 28px rgba(205, 180, 219, 0.25), 0 0 0 1px rgba(205, 180, 219, 0.35)",
            "0 0 40px rgba(205, 180, 219, 0.38), 0 0 0 1px rgba(205, 180, 219, 0.5)",
            "0 0 28px rgba(205, 180, 219, 0.25), 0 0 0 1px rgba(205, 180, 219, 0.35)",
          ],
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />

      {/* Core disc */}
      <div
        className="relative h-[7.5rem] w-[7.5rem] overflow-hidden rounded-full sm:h-[8.5rem] sm:w-[8.5rem]"
        style={{
          background:
            "radial-gradient(circle at 32% 26%, #4a4654 0%, #1e1c24 38%, #121118 68%, #08080c 100%)",
          boxShadow:
            "inset 0 -12px 24px rgba(0,0,0,0.55), inset 0 8px 16px rgba(255,255,255,0.04)",
        }}
      >
        {/* Glass reflection */}
        <div
          className="pointer-events-none absolute left-[14%] top-[10%] h-[32%] w-[48%] rotate-[-28deg] rounded-[50%] bg-white/[0.14] blur-[0.5px]"
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute left-[22%] top-[16%] h-[12%] w-[22%] rounded-full bg-white/20"
          aria-hidden
          animate={{ opacity: [0.35, 0.55, 0.35] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        />

        {/* Inner depth ring */}
        <motion.div
          className="absolute inset-[14%] rounded-full border border-white/[0.06]"
          aria-hidden
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        />

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#cdb4db]"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
            }}
            animate={{
              opacity: [0.15, 0.65, 0.2],
              y: [0, -3, 0],
              x: [0, i % 2 === 0 ? 1 : -1, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.8 + (i % 3) * 0.4,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Core highlight dot */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e8dff0]"
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}
