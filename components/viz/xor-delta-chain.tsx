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

/* Sizes follow the sparse-XOR wire format in crates/fsqlite-mvcc/src/xor_delta.rs:
   an 8-byte header, then one run per stretch of changed bytes (u16 offset + u16
   length + the XORed bytes). A delta is kept only if it saves at least 25% of a
   full page image (DEFAULT_DELTA_THRESHOLD_PCT); otherwise the full image is stored.
   In this demo each cell is a 64-byte chunk, and a highlighted chunk is assumed to
   be fully rewritten. The changes themselves are illustrative. */
const PAGE_BYTES = 4096;
const CHUNK_BYTES = PAGE_BYTES / (COLS * ROWS); // 64
const DELTA_HEADER_BYTES = 8;
const DELTA_RUN_HEADER_BYTES = 4;
const MIN_SAVING_PCT = 25;
const MAX_DELTA_BYTES = (PAGE_BYTES * (100 - MIN_SAVING_PCT)) / 100; // 3072

/** Encoded sparse-XOR size if every chunk in `changed` is fully rewritten. */
function encodedDeltaBytes(changed: Set<number>): number {
  let runs = 0;
  for (let i = 0; i < COLS * ROWS; i++) {
    if (changed.has(i) && !changed.has(i - 1)) runs++;
  }
  return DELTA_HEADER_BYTES + runs * DELTA_RUN_HEADER_BYTES + changed.size * CHUNK_BYTES;
}

/** Chunks that differ between v1 and v2: a small update touching 3 chunks. */
const V2_CHANGED: Set<number> = new Set([5, 22, 51]);

/** Chunks that differ between v2 and v3: a rewrite of most of the page (every chunk but each 5th). */
const V3_CHANGED: Set<number> = new Set(
  Array.from({ length: COLS * ROWS }, (_, i) => i).filter((i) => i % 5 !== 0),
);

const V2_DELTA_BYTES = encodedDeltaBytes(V2_CHANGED); // 212
const V3_DELTA_BYTES = encodedDeltaBytes(V3_CHANGED); // 3,324
const V3_CHANGED_PCT = Math.round((V3_CHANGED.size / (COLS * ROWS)) * 100);

const steps: Step[] = [
  {
    label: "Page v1: the original page",
    description: `A ${PAGE_BYTES.toLocaleString()}-byte page drawn as a 4×16 grid. Each cell stands for a ${CHUNK_BYTES}-byte chunk.`,
  },
  {
    label: `Page v2: ${V2_CHANGED.size} chunks changed`,
    description: `A small update rewrites ${V2_CHANGED.size} chunks (${V2_CHANGED.size * CHUNK_BYTES} bytes). Changed chunks are amber.`,
  },
  {
    label: "XOR delta computed",
    description: `v1 XOR v2 is zero wherever the pages match. Only the ${V2_CHANGED.size} changed stretches are non-zero, and XOR is its own inverse, so either version can be rebuilt from the other plus the delta.`,
  },
  {
    label: "Sparse delta stored",
    description: `The delta encodes each non-zero stretch as a run: ${DELTA_HEADER_BYTES}-byte header + ${V2_CHANGED.size} × (${DELTA_RUN_HEADER_BYTES}-byte run header + ${CHUNK_BYTES} bytes) = ${V2_DELTA_BYTES} bytes, instead of a ${PAGE_BYTES.toLocaleString()}-byte copy. That figure is for this example only.`,
  },
  {
    label: `Page v3: ${V3_CHANGED_PCT}% of chunks changed`,
    description: `A large update rewrites ${V3_CHANGED.size} of 64 chunks. The delta would be ${V3_DELTA_BYTES.toLocaleString()} bytes.`,
  },
  {
    label: "Full image stored instead",
    description: `A delta is kept only if it saves at least ${MIN_SAVING_PCT}% (at most ${MAX_DELTA_BYTES.toLocaleString()} bytes for a 4 KiB page). ${V3_DELTA_BYTES.toLocaleString()} bytes does not, so v3 is stored as a full page image.`,
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

  // Size comparison data (this example only)
  const fullSize = PAGE_BYTES;
  const deltaSize = V2_DELTA_BYTES;

  return (
    <VizContainer
      title="XOR Delta Version Chain"
      status="dormant"
      description="A tested library for storing old page versions as sparse XOR deltas instead of full copies. The live MVCC version store still keeps full page images; this compression is not wired in yet."
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
                    XOR delta: {V2_CHANGED.size} non-zero runs
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
                    Full page: {fullSize.toLocaleString()} B
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
                    Delta: {deltaSize} B (this example)
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
                    x={W / 2 - 190}
                    y={gridY + ROWS * (CELL_SIZE + CELL_GAP) + 25}
                    width={380}
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
                    Delta {V3_DELTA_BYTES.toLocaleString()} B saves &lt; {MIN_SAVING_PCT}% → store
                    full image
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
              A way to store several committed versions of the same{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> without keeping a full copy of
              each. Adjacent versions are XORed, and only the non-zero stretches are stored as a{" "}
              <FrankenJargon term="xor-delta">sparse XOR delta</FrankenJargon>.
            </div>
            <div>
              This lives in <code>fsqlite-mvcc</code> as a tested library, plus an opt-in archive
              format for a page&apos;s history. The live{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> version store does not use it: it
              keeps full page images and drops old ones once no snapshot needs them.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Step through the animation. When v2 rewrites a few chunks of v1, the XOR is mostly
              zeros, and the amber blocks at the bottom are the runs that would be stored.
            </p>
            <p>
              At the last stage, v3 rewrites most of the page. The delta would save less than 25%
              of a full image, so a full image is stored instead. The 25% minimum saving is the
              library&apos;s default. In the archive format, the newest version is kept whole, older
              versions are stored as reverse deltas, and a full image appears at least every 32
              versions so rebuilding any version takes at most 31 deltas.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Page-level <FrankenJargon term="mvcc">MVCC</FrankenJargon> keeps a whole page copy for
              each committed version until garbage collection can drop it. When an update changes a
              few bytes, most of that copy repeats the previous one, and long-running readers keep
              old versions alive longer.
            </div>
            <div>
              Delta encoding would shrink that retained history when changes are small. It is
              compression of two known committed images, not a way to merge concurrent writes: raw
              XOR merging of SQLite pages is explicitly ruled out, because when a cell moves, two
              edits to different bytes can still lose an update. How much space it would save on
              real workloads has not been measured.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
