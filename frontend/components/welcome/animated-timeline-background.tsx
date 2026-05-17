"use client";

import { motion } from "framer-motion";

const PATHS = [
  "M 40 320 L 200 320 L 280 320",
  "M 280 320 Q 340 320 380 260 L 480 200",
  "M 280 320 Q 340 320 400 380 L 520 420",
  "M 280 320 Q 320 280 360 240 L 440 180",
  "M 280 320 Q 320 360 360 400 L 460 460",
  "M 480 200 L 560 160 L 640 140",
  "M 480 200 L 520 120 L 600 80",
  "M 520 420 L 600 440 L 720 450",
  "M 440 180 L 500 140 L 580 100",
];

export function AnimatedTimelineBackground() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 55%, rgba(139,124,248,0.12), transparent 65%), radial-gradient(ellipse 40% 30% at 80% 20%, rgba(94,234,212,0.06), transparent 50%)",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b7cf8" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#8b7cf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {PATHS.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth={i === 0 ? 2.5 : 1.5}
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: i === 0 ? 0.9 : 0.55 }}
            transition={{
              pathLength: { duration: 2 + i * 0.15, ease: "easeInOut", delay: i * 0.2 },
              opacity: { duration: 0.6, delay: i * 0.15 },
            }}
          />
        ))}

        {[
          [200, 320],
          [280, 320],
          [380, 260],
          [400, 380],
          [360, 240],
          [480, 200],
          [520, 120],
          [600, 80],
          [640, 140],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={4}
            fill="#8b7cf8"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.7] }}
            transition={{
              delay: 0.8 + i * 0.12,
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 3 + i * 0.2,
            }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute left-1/2 top-[58%] h-24 w-24 -translate-x-1/2 rounded-full border border-[var(--primary)]/40 bg-[var(--surface)]/80 shadow-[0_0_40px_rgba(139,124,248,0.35)]"
        animate={{ boxShadow: ["0 0 30px rgba(139,124,248,0.25)", "0 0 55px rgba(139,124,248,0.45)", "0 0 30px rgba(139,124,248,0.25)"] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <div className="flex h-full items-center justify-center text-xs font-bold tracking-widest text-[var(--primary)]">
          //
        </div>
      </motion.div>
    </motion.div>
  );
}
