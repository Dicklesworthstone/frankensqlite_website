"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLS = 16;
const ROWS = 4;
const CELL_SIZE = 28;
const CELL_GAP = 3;

/** Indices of cells that differ between v1 → v2 (3 changed bytes) */
const V2_CHANGED: Set<number> = new Set([5, 22, 51]);

/** Indices of cells that differ between v2 → v3 (40% changed = above threshold) */
const V3_CHANGED: Set<number> = new Set(
  Array.from({ length: 26 }, (_, i) => i * 2 + 1), // every other cell => 26 cells ≈ 40%
);

const steps: Step[] = [
  {
    label: "Page v1 — the original page",
    description:
      "A 4096-byte database page represented as a 4×16 byte grid. Each cell represents a 64-byte chunk.",
  },
  {
    label: "Page v2 — 3 bytes changed",
    description: "A new transaction modifies 3 cells. Changed bytes are highlighted in amber.",
  },
  {
    label: "XOR delta computed",
    description:
      "XOR(v1, v2) produces a sparse delta. Only the 3 changed offsets have non-zero values; everything else is zero.",
  },
  {
    label: "Compact delta stored — 93% savings",
    description:
      "Instead of storing a full 4096-byte page copy, we store only the 3 non-zero offsets. This saves 93% of version chain storage.",
  },
  {
    label: "Page v3 — 40% of bytes changed",
    description: "A large update modifies 26 of 64 cells, above the 25% threshold.",
  },
  {
    label: "Full page stored instead",
    description:
      "When the delta exceeds 25% of the page size, a full page copy is cheaper than a sparse delta. FrankenSQLite stores v3 as a complete snapshot.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PALETTE_V1 = [
  "rgba(20,184,166,0.4)",
  "rgba(20,184,166,0.5)",
  "rgba(20,184,166,0.35)",
  "rgba(20,184,166,0.45)",
];

function getCellColor(cellIdx: number, step: number, side: "left" | "right" | "delta"): string {
  if (side === "delta") {
    // Steps 2-3: XOR delta — only changed cells are non-zero
    if (step >= 2 && step <= 3) {
      return V2_CHANGED.has(cellIdx) ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.03)";
    }
    return "rgba(255,255,255,0.03)";
  }

  if (side === "left") {
    // v1 always shown on left (steps 0-3)
    return PALETTE_V1[cellIdx % PALETTE_V1.length];
  }

  // Right side
  if (step <= 0) return "rgba(255,255,255,0.04)";
  if (step <= 3) {
    // v2 with highlights
    return V2_CHANGED.has(cellIdx)
      ? "rgba(251,191,36,0.7)"
      : PALETTE_V1[cellIdx % PALETTE_V1.length];
  }
  if (step === 4) {
    // v3 with many changes
    return V3_CHANGED.has(cellIdx)
      ? "rgba(239,68,68,0.6)"
      : PALETTE_V1[cellIdx % PALETTE_V1.length];
  }
  // Step 5: full page stored
  return V3_CHANGED.has(cellIdx) ? "rgba(239,68,68,0.5)" : PALETTE_V1[cellIdx % PALETTE_V1.length];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function PageGrid({
  x,
  y,
  step,
  side,
  label,
  dur,
}: {
  x: number;
  y: number;
  step: number;
  side: "left" | "right" | "delta";
  label: string;
  dur: number;
}) {
  const cells = useMemo(() => {
    const arr: { cx: number; cy: number; idx: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        arr.push({
          cx: x + c * (CELL_SIZE + CELL_GAP),
          cy: y + r * (CELL_SIZE + CELL_GAP),
          idx,
        });
      }
    }
    return arr;
  }, [x, y]);

  return (
    <g>
      <text
        x={x + (COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP) / 2}
        y={y - 12}
        textAnchor="middle"
        fontSize={11}
        className="fill-slate-400 font-bold"
      >
        {label}
      </text>
      {cells.map((cell) => (
        <motion.rect
          key={`${side}-${cell.idx}`}
          x={cell.cx}
          y={cell.cy}
          width={CELL_SIZE}
          height={CELL_SIZE}
          rx={4}
          animate={{
            fill: getCellColor(cell.idx, step, side),
          }}
          transition={{ duration: dur, delay: cell.idx * 0.005 }}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function XorDeltaChain() {
  const [currentStep, setCurrentStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const dur = prefersReducedMotion ? 0 : 0.35;

  const handleStepChange = useCallback((s: number) => setCurrentStep(s), []);

  const W = 720;
  const H = 380;
  const gridW = COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const leftX = 20;
  const rightX = W - gridW - 20;
  const gridY = 60;

  const showDelta = currentStep >= 2 && currentStep <= 3;
  const showV3 = currentStep >= 4;

  // Size comparison data
  const fullSize = 4096;
  const deltaSize = V2_CHANGED.size * 64;
  const savings = Math.round((1 - deltaSize / fullSize) * 100);

  return (
    <VizContainer
      title="XOR Delta Version Chain"
      description="Sparse byte-level diffs compress MVCC version chains by up to 93%."
    >
      <div className="p-4 md:p-6">
        <div className="relative w-full overflow-hidden group">
          {/* Mobile swipe hint */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 md:hidden pointer-events-none opacity-60 transition-opacity group-hover:opacity-0 delay-1000">
            <div className="bg-black/50 backdrop-blur-sm text-[10px] text-white/70 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
              <span>←</span>
              <span>Swipe to explore</span>
              <span>→</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto touch-pan-x scrollbar-hide pb-4">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto min-w-[720px] md:min-w-full"
              role="img"
              aria-label="XOR Delta version chain visualization"
            >
              {/* Left page grid (always v1 for steps 0-3, v2 for 4-5) */}
              <PageGrid
                x={leftX}
                y={gridY}
                step={currentStep}
                side="left"
                label={showV3 ? "Page v2" : "Page v1"}
                dur={dur}
              />

              {/* Right page grid (v2 for steps 1-3, v3 for steps 4-5) */}
              <AnimatePresence>
                {currentStep >= 1 && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: dur }}
                  >
                    <PageGrid
                      x={rightX}
                      y={gridY}
                      step={currentStep}
                      side="right"
                      label={showV3 ? "Page v3" : "Page v2"}
                      dur={dur}
                    />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* XOR arrow between grids */}
              {currentStep >= 1 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: dur }}
                >
                  <text
                    x={W / 2}
                    y={gridY + 40}
                    textAnchor="middle"
                    fontSize={16}
                    className="fill-white font-black"
                  >
                    ⊕
                  </text>
                  <text
                    x={W / 2}
                    y={gridY + 58}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-slate-500 font-bold"
                  >
                    XOR
                  </text>
                </motion.g>
              )}

              {/* Delta display (steps 2-3) */}
              {showDelta && (
                <motion.g
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: dur }}
                >
                  <text
                    x={W / 2}
                    y={gridY + ROWS * (CELL_SIZE + CELL_GAP) + 30}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-slate-400 font-bold"
                  >
                    XOR Delta: {V2_CHANGED.size} non-zero offsets
                  </text>

                  {/* Compact delta blocks */}
                  {currentStep >= 3 && (
                    <g>
                      {Array.from(V2_CHANGED).map((idx, i) => (
                        <motion.rect
                          key={`delta-${idx}`}
                          x={W / 2 - 50 + i * 34}
                          y={gridY + ROWS * (CELL_SIZE + CELL_GAP) + 40}
                          width={28}
                          height={28}
                          rx={4}
                          fill="rgba(251,191,36,0.7)"
                          stroke="rgba(251,191,36,0.4)"
                          strokeWidth={1}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                        />
                      ))}
                    </g>
                  )}
                </motion.g>
              )}

              {/* Size comparison bar */}
              {currentStep >= 3 && currentStep <= 3 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: dur }}
                >
                  <text x={leftX} y={H - 40} fontSize={10} className="fill-slate-500 font-bold">
                    Full page: {fullSize}B
                  </text>
                  <rect
                    x={leftX + 100}
                    y={H - 50}
                    width={200}
                    height={16}
                    rx={4}
                    fill="rgba(255,255,255,0.06)"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={0.5}
                  />
                  <motion.rect
                    x={leftX + 100}
                    y={H - 50}
                    height={16}
                    rx={4}
                    fill="rgba(251,191,36,0.5)"
                    initial={{ width: 200 }}
                    animate={{ width: 200 * (deltaSize / fullSize) }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                  <text
                    x={leftX + 320}
                    y={H - 38}
                    fontSize={11}
                    className="fill-amber-400 font-black"
                  >
                    Delta: {deltaSize}B ({savings}% saved)
                  </text>
                </motion.g>
              )}

              {/* Full copy indicator (step 5) */}
              {currentStep === 5 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: dur }}
                >
                  <rect
                    x={W / 2 - 140}
                    y={gridY + ROWS * (CELL_SIZE + CELL_GAP) + 25}
                    width={280}
                    height={36}
                    rx={8}
                    fill="rgba(239,68,68,0.15)"
                    stroke="rgba(239,68,68,0.3)"
                    strokeWidth={1}
                  />
                  <text
                    x={W / 2}
                    y={gridY + ROWS * (CELL_SIZE + CELL_GAP) + 48}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-red-300 font-bold"
                  >
                    Delta &gt; 25% → store full page copy
                  </text>
                </motion.g>
              )}
            </svg>
          </div>
        </div>

        <div className="mt-4">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            autoPlayInterval={3500}
          />
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at how FrankenSQLite physically stores multiple versions of the same{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> to enable{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon>.
            </div>
            <div>
              Storing full 4KB copies for every single transaction would bloat the database
              instantly. Instead, the engine stores a chain of{" "}
              <FrankenJargon term="xor-delta">XOR Deltas</FrankenJargon>.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Watch the stepper animation. When V2 changes just a few bytes of V1, the engine
              computes an XOR difference. Notice the amber blocks at the bottom: this represents the
              highly compressed delta being saved to disk.
            </p>
            <p>
              As long as the delta is small, it achieves up to 93% compression. However, on Step 5,
              you see what happens if someone deletes half the rows on a page: if the delta exceeds
              25% of the page size, the engine falls back to storing a full 4KB copy to prevent the
              chain from becoming too expensive to reconstruct.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> databases like PostgreSQL suffer from
              vacuuming bloat because they leave dead rows scattered throughout the main{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> tables.
            </div>
            <div>
              By storing highly compressed{" "}
              <FrankenJargon term="xor-delta">XOR deltas</FrankenJargon> in a dedicated log rather
              than the main table, FrankenSQLite keeps the hot database pages clean while
              maintaining thousands of historical snapshots with minimal storage overhead.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
