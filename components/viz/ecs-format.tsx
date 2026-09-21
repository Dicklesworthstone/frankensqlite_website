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

const K = 8; // source symbols
const R = 4; // repair symbols
const TOTAL = K + R;
const CORRUPT_IDX = 3; // which source symbol gets corrupted

const steps: Step[] = [
  {
    label: "Raw database page",
    description: "A 4096-byte database page, the fundamental unit of storage in FrankenSQLite.",
  },
  {
    label: "Partition into K source symbols",
    description: `The page is split into ${K} equal-sized source symbols, each 512 bytes.`,
  },
  {
    label: "BLAKE3 hash → ObjectId",
    description:
      "The full page is hashed with BLAKE3 to produce a 256-bit content-addressed ObjectId.",
  },
  {
    label: "RaptorQ encoder → R repair symbols",
    description: `The encoder generates ${R} repair symbols from the ${K} source symbols. These provide redundancy for corruption recovery.`,
  },
  {
    label: "Systematic layout: zero-copy reads",
    description: `The first ${K} symbols are the raw source data. Normal reads require no decoding. Repair symbols sit at the end.`,
  },
  {
    label: "Corruption detected!",
    description: "A checksum mismatch reveals that source symbol #4 has been corrupted by bit rot.",
  },
  {
    label: "Repair symbols reconstruct the data",
    description: `Any ${K} of the ${TOTAL} total symbols are sufficient to reconstruct the full page. The corrupted symbol is rebuilt from the remaining intact data.`,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getSymbolColor(index: number, step: number, isSource: boolean): string {
  if (step < 1) return "rgba(255,255,255,0.06)";

  // Step 5: corruption — highlight the corrupted symbol in red
  if (step === 5 && isSource && index === CORRUPT_IDX) {
    return "rgba(239,68,68,0.8)";
  }

  // Step 6: recovered — flash the repaired symbol green then back to teal
  if (step === 6 && isSource && index === CORRUPT_IDX) {
    return "rgba(52,211,153,0.8)";
  }

  if (isSource) return "rgba(20,184,166,0.6)";
  if (step >= 3) return "rgba(251,191,36,0.5)";
  return "rgba(255,255,255,0.06)";
}

function getSymbolBorder(index: number, step: number, isSource: boolean): string {
  if (step === 5 && isSource && index === CORRUPT_IDX) return "rgba(239,68,68,1)";
  if (step === 6 && isSource && index === CORRUPT_IDX) return "rgba(52,211,153,1)";
  if (isSource && step >= 1) return "rgba(20,184,166,0.4)";
  if (!isSource && step >= 3) return "rgba(251,191,36,0.3)";
  return "rgba(255,255,255,0.08)";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EcsFormat() {
  const [currentStep, setCurrentStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const dur = prefersReducedMotion ? 0 : 0.4;

  const handleStepChange = useCallback((s: number) => setCurrentStep(s), []);

  // SVG dimensions
  const W = 720;
  const H = 360;
  const symW = 44;
  const symH = 50;
  const gap = 6;
  const gridLeft = (W - (TOTAL * (symW + gap) - gap)) / 2;
  const gridTop = 120;

  const symbols = useMemo(() => {
    const arr: { x: number; y: number; isSource: boolean; index: number; label: string }[] = [];
    for (let i = 0; i < TOTAL; i++) {
      arr.push({
        x: gridLeft + i * (symW + gap),
        y: gridTop,
        isSource: i < K,
        index: i,
        label: i < K ? `S${i}` : `R${i - K}`,
      });
    }
    return arr;
  }, [gridLeft]);

  return (
    <VizContainer
      title="ECS Format Explorer"
      description="Erasure-Coded Streams: content-addressed, RaptorQ-protected storage objects with zero-copy reads."
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
              aria-label="ECS Format step-by-step visualization"
            >
              {/* Raw page block (step 0) */}
              <AnimatePresence>
                {currentStep === 0 && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: dur }}
                  >
                    <rect
                      x={W / 2 - 120}
                      y={80}
                      width={240}
                      height={140}
                      rx={12}
                      fill="rgba(20,184,166,0.15)"
                      stroke="rgba(20,184,166,0.4)"
                      strokeWidth={2}
                    />
                    <text
                      x={W / 2}
                      y={150}
                      textAnchor="middle"
                      className="fill-white text-sm font-bold"
                      fontSize={14}
                    >
                      Database Page
                    </text>
                    <text
                      x={W / 2}
                      y={175}
                      textAnchor="middle"
                      className="fill-slate-500 text-xs"
                      fontSize={11}
                    >
                      4096 bytes
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Symbol grid (steps 1+) */}
              {currentStep >= 1 && (
                <g>
                  {/* Labels */}
                  {currentStep >= 4 && (
                    <>
                      <text
                        x={gridLeft + (K * (symW + gap)) / 2 - gap / 2}
                        y={gridTop - 16}
                        textAnchor="middle"
                        fontSize={10}
                        className="fill-teal-400 font-bold"
                      >
                        Source ({K})
                      </text>
                      <text
                        x={gridLeft + K * (symW + gap) + (R * (symW + gap)) / 2 - gap / 2}
                        y={gridTop - 16}
                        textAnchor="middle"
                        fontSize={10}
                        className="fill-amber-400 font-bold"
                      >
                        Repair ({R})
                      </text>
                      {/* Divider line */}
                      <line
                        x1={gridLeft + K * (symW + gap) - gap / 2}
                        y1={gridTop - 8}
                        x2={gridLeft + K * (symW + gap) - gap / 2}
                        y2={gridTop + symH + 8}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={1}
                        strokeDasharray="4,4"
                      />
                    </>
                  )}

                  {/* Symbol blocks */}
                  {symbols.map((sym) => {
                    const visible = sym.isSource || currentStep >= 3;
                    if (!visible) return null;

                    return (
                      <motion.g
                        key={sym.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: dur, delay: sym.index * 0.03 }}
                      >
                        <motion.rect
                          x={sym.x}
                          y={sym.y}
                          width={symW}
                          height={symH}
                          rx={6}
                          animate={{
                            fill: getSymbolColor(sym.index, currentStep, sym.isSource),
                            stroke: getSymbolBorder(sym.index, currentStep, sym.isSource),
                          }}
                          transition={{ duration: dur }}
                          strokeWidth={1.5}
                        />
                        <text
                          x={sym.x + symW / 2}
                          y={sym.y + symH / 2 + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={11}
                          className="fill-white font-bold pointer-events-none"
                        >
                          {sym.label}
                        </text>

                        {/* Corruption X mark */}
                        {currentStep === 5 && sym.isSource && sym.index === CORRUPT_IDX && (
                          <motion.g
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          >
                            <line
                              x1={sym.x + 10}
                              y1={sym.y + 10}
                              x2={sym.x + symW - 10}
                              y2={sym.y + symH - 10}
                              stroke="white"
                              strokeWidth={3}
                              strokeLinecap="round"
                            />
                            <line
                              x1={sym.x + symW - 10}
                              y1={sym.y + 10}
                              x2={sym.x + 10}
                              y2={sym.y + symH - 10}
                              stroke="white"
                              strokeWidth={3}
                              strokeLinecap="round"
                            />
                          </motion.g>
                        )}

                        {/* Recovery checkmark */}
                        {currentStep === 6 && sym.isSource && sym.index === CORRUPT_IDX && (
                          <motion.path
                            d={`M${sym.x + 14},${sym.y + symH / 2} l${8},${8} l${12},${-16}`}
                            fill="none"
                            stroke="white"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                        )}
                      </motion.g>
                    );
                  })}
                </g>
              )}

              {/* BLAKE3 hash display (step 2+) */}
              {currentStep >= 2 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: dur }}
                >
                  <rect
                    x={W / 2 - 150}
                    y={gridTop + symH + 30}
                    width={300}
                    height={36}
                    rx={8}
                    fill="rgba(139,92,246,0.15)"
                    stroke="rgba(139,92,246,0.3)"
                    strokeWidth={1}
                  />
                  <text
                    x={W / 2}
                    y={gridTop + symH + 52}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-purple-300 font-mono font-bold"
                  >
                    ObjectId: blake3(&quot;7f3a...c8e1&quot;)
                  </text>
                </motion.g>
              )}

              {/* Size comparison bar (step 4+) */}
              {currentStep >= 4 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: dur }}
                >
                  <text
                    x={gridLeft}
                    y={gridTop + symH + 90}
                    fontSize={10}
                    className="fill-slate-500 font-bold"
                  >
                    Layout:
                  </text>
                  {/* Source portion */}
                  <rect
                    x={gridLeft + 50}
                    y={gridTop + symH + 78}
                    width={200}
                    height={18}
                    rx={4}
                    fill="rgba(20,184,166,0.3)"
                    stroke="rgba(20,184,166,0.2)"
                    strokeWidth={1}
                  />
                  <text
                    x={gridLeft + 150}
                    y={gridTop + symH + 91}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-teal-300 font-bold"
                  >
                    Zero-copy readable data
                  </text>
                  {/* Repair portion */}
                  <rect
                    x={gridLeft + 252}
                    y={gridTop + symH + 78}
                    width={100}
                    height={18}
                    rx={4}
                    fill="rgba(251,191,36,0.2)"
                    stroke="rgba(251,191,36,0.2)"
                    strokeWidth={1}
                  />
                  <text
                    x={gridLeft + 302}
                    y={gridTop + symH + 91}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-amber-300 font-bold"
                  >
                    Parity
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
            autoPlayInterval={3000}
          />
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at how FrankenSQLite partitions a raw 4 KB{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> into the{" "}
              <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon> format. The page is
              divided into K source symbols (teal) and then extended with additional{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> (amber) computed by
              the <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> encoder over{" "}
              <FrankenJargon term="gf256">GF(256)</FrankenJargon> arithmetic.
            </p>
            <p>
              The <FrankenJargon term="systematic-layout">systematic layout</FrankenJargon> keeps
              source symbols first, so normal reads access the original data directly without
              decoding. Repair symbols activate only when corruption is detected.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Step through the 7 stages. Watch the raw page split into source symbols, see the
              BLAKE3 content-addressed ObjectId computed for the full page, then observe the{" "}
              <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> encoder generate repair symbols.
              At step 5, a source symbol turns red (simulated corruption). At step 6, the engine
              uses the surviving source and repair symbols to reconstruct the corrupted data, which
              flashes green on recovery.
            </p>
            <p>
              Notice that the source symbols come first in the layout. During normal reads, the
              engine accesses these directly. The repair symbols sit in the trailing positions,
              inert until needed.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              This is the physical format that gives FrankenSQLite its self-healing property.
              Because <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> is a rateless fountain
              code, the engine can generate as many repair symbols as needed per block, trading disk
              overhead for durability. The{" "}
              <FrankenJargon term="systematic-layout">systematic layout</FrankenJargon> means you
              pay zero CPU cost for reads under normal conditions; decoding only activates on the
              rare occasion that corruption is detected. This gives you enterprise-grade data
              protection without sacrificing read performance.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
