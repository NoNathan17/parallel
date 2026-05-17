"use client";

import { motion } from "framer-motion";

import { TimelineCoreOrb } from "@/components/welcome/timeline-core-orb";

/** Center of viewBox — all paths start here (orb edge) */
const CX = 300;
const CY = 120;

const BRANCH_PATHS = [
  `M ${CX} ${CY} L 200 ${CY} L 48 ${CY}`,
  `M ${CX} ${CY} Q 340 95 400 58 L 520 28`,
  `M ${CX} ${CY} Q 355 145 410 175 L 540 210`,
  `M ${CX} ${CY} Q 325 75 370 42 L 480 18`,
  `M ${CX} ${CY} Q 335 165 380 195 L 500 228`,
  `M ${CX} ${CY} L 552 ${CY}`,
  `M ${CX} ${CY} Q 365 88 430 72 L 560 48`,
  `M ${CX} ${CY} Q 368 152 435 168 L 565 188`,
] as const;

const END_NODES: [number, number][] = [
  [48, CY],
  [520, 28],
  [540, 210],
  [480, 18],
  [500, 228],
  [552, CY],
  [560, 48],
  [565, 188],
];

/** Branches + timeline core orb — unified singularity focal point */
export function WelcomeTimelineScene() {
  return (
    <div
      className="relative mx-auto my-5 h-[11rem] w-full max-w-xl sm:my-7 sm:h-[13rem]"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 600 240"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="branchStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cdb4db" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#b8a0c8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#a2d2ff" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {BRANCH_PATHS.map((d, i) => {
          const isTrunk = i === 0 || i === 5;
          const width = isTrunk ? 4 : 3;
          const glowWidth = isTrunk ? 7 : 5.5;

          return (
            <g key={d}>
              {/* Soft halo so thick lines read on light bg */}
              <motion.path
                d={d}
                fill="none"
                stroke="#cdb4db"
                strokeWidth={glowWidth}
                strokeLinecap="round"
                strokeOpacity={0.22}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 1.4, ease: "easeInOut", delay: 0.12 + i * 0.07 },
                  opacity: { duration: 0.4, delay: 0.12 + i * 0.07 },
                }}
              />
              <motion.path
                d={d}
                fill="none"
                stroke="url(#branchStroke)"
                strokeWidth={width}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 1.4, ease: "easeInOut", delay: 0.15 + i * 0.07 },
                  opacity: { duration: 0.4, delay: 0.15 + i * 0.07 },
                }}
              />
            </g>
          );
        })}

        {END_NODES.map(([x, y], i) => (
          <motion.circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={5}
            fill="#a2d2ff"
            stroke="#cdb4db"
            strokeWidth={1.5}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{ delay: 0.9 + i * 0.05, duration: 0.35 }}
          />
        ))}
      </svg>

      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <TimelineCoreOrb />
      </div>
    </div>
  );
}
