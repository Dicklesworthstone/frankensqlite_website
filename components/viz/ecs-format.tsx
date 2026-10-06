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

const K = 8; // source symbols (illustrative: 8 x 512 bytes)
// The design's default repair budget (crates/fsqlite-core/src/repair_symbols.rs):
// R = max(2, ceil(K * 20%)), raised to 3 for objects of 8 symbols or fewer.
const R = 3;
const TOTAL = K + R;
const CORRUPT_IDX = 3; // which source symbol gets corrupted

const steps: Step[] = [
  {
    label: "An ECS object",
    description:
      "In the native-mode design every durable object (commit capsule, page snapshot, schema snapshot) is an ECS object. This example uses a 4,096-byte payload.",
  },
  {
    label: "Partition into K source symbols",
    description: `The payload is split into ${K} source symbols of equal size. The symbol size is recorded in the object's RaptorQ header (OTI); 512 bytes is just this example.`,
  },
  {
    label: "BLAKE3 → 128-bit ObjectId",
    description:
      'The payload is hashed with BLAKE3. The ObjectId is BLAKE3 over a domain tag ("fsqlite:ecs:v1"), the canonical header and that payload hash, truncated to 128 bits.',
  },
  {
    label: "RaptorQ encoder → R repair symbols",
    description: `The encoder computes ${R} repair symbols from the ${K} source symbols. The design's default budget is 20% overhead with at least 2 extra symbols, and 3 for objects this small.`,
  },
  {
    label: "Systematic layout",
    description: `The first ${K} symbols are the original bytes, so reading an intact object needs no decoding. Repair symbols follow them.`,
  },
  {
    label: "Damage detected",
    description:
      "Each symbol is stored in a record with an XXH3 check. Here the check on S3 fails (simulated bit rot).",
  },
  {
    label: "Decode rebuilds the data",
    description: `RaptorQ needs about ${K} intact symbols, sometimes one or two more. ${TOTAL - 1} of ${TOTAL} survive here, so the decoder rebuilds S3.`,
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
      status="design"
      description="How the native-mode design stores an object: named by a BLAKE3-derived ObjectId and encoded as RaptorQ source and repair symbols. Design plus partial implementation; not used by the default runtime."
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
                      ECS Object Payload
                    </text>
                    <text
                      x={W / 2}
                      y={175}
                      textAnchor="middle"
                      className="fill-slate-500 text-xs"
                      fontSize={11}
                    >
                      4,096 bytes (example)
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
                    x={W / 2 - 230}
                    y={gridTop + symH + 30}
                    width={460}
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
                    ObjectId = Trunc128(BLAKE3(&quot;fsqlite:ecs:v1&quot; ‖ header ‖ payload_hash))
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
                    Source = original bytes
                  </text>
                  {/* Repair portion (width proportional to R/K) */}
                  <rect
                    x={gridLeft + 252}
                    y={gridTop + symH + 78}
                    width={(200 * R) / K}
                    height={18}
                    rx={4}
                    fill="rgba(251,191,36,0.2)"
                    stroke="rgba(251,191,36,0.2)"
                    strokeWidth={1}
                  />
                  <text
                    x={gridLeft + 252 + (100 * R) / K}
                    y={gridTop + symH + 91}
                    textAnchor="middle"
                    fontSize={9}
                    className="fill-amber-300 font-bold"
                  >
                    Repair
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
              How an object is laid out in the{" "}
              <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon>, the storage format in
              FrankenSQLite&apos;s native-mode design. The payload is divided into K source symbols
              (teal) and extended with{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> (amber) computed by
              the <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> encoder over{" "}
              <FrankenJargon term="gf256">GF(256)</FrankenJargon> arithmetic.
            </p>
            <p>
              Each symbol is stored as a <code>SymbolRecord</code>. Its fields include the magic
              bytes <code>FSEC</code>, the 16-byte ObjectId, the RaptorQ header (OTI), the
              symbol&apos;s index (ESI), the symbol bytes, an XXH3 check and an optional
              authentication tag. These record types exist in the code today; the native mode that
              would use them for all storage does not.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Step through the 7 stages. The payload splits into source symbols, gets its{" "}
              <FrankenJargon term="content-addressed">content-addressed</FrankenJargon> ObjectId,
              and the encoder adds repair symbols. At stage 6 a source symbol fails its check
              (simulated). At stage 7 the decoder rebuilds it from the surviving source and repair
              symbols.
            </p>
            <p>
              The source symbols come first and hold the original bytes. An intact object is read
              from them directly; the repair symbols are only needed after damage.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> is a fountain code, so the
              encoder can produce more repair symbols for the same object later. Repair symbols are
              deterministic: the same object and count always give the same symbols. That lets the
              design raise redundancy by appending symbols instead of rewriting data.
            </p>
            <p>
              Because the code is{" "}
              <FrankenJargon term="systematic-layout">systematic</FrankenJargon>, the cost of the
              redundancy is mostly disk space and encode time, not decode work on every read. How
              much it costs in practice has not been measured for a shipped native mode, because
              there is not one yet.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
