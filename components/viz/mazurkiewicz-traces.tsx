"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Compass } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

export default function MazurkiewiczTraces() {
  const [step, setStep] = useState(0);

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));
  const reset = () => setStep(0);

  return (
    <VizContainer
      title="Mazurkiewicz Traces + DPOR"
      description="Testing concurrent code by running random thread interleavings is like trying random codes on a padlock. You&apos;ll probably never find the bug. FrankenSQLite uses Mazurkiewicz traces to mathematically group equivalent schedules, achieving exhaustive concurrency verification."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative">
        <div className="flex justify-center gap-2 mb-4">
          {["Naive Paths", "Independence", "Equivalence Classes", "DPOR Execution"].map(
            (label, i) => (
              <div
                key={label}
                className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${i === step ? "border-teal-500 bg-teal-500/20 text-teal-400" : "border-white/10 text-slate-500"}`}
              >
                {label}
              </div>
            ),
          )}
        </div>

        <div className="flex-1 relative flex items-center justify-center min-h-[220px]">
          <AnimatePresence mode="wait">
            {/* Step 0: Naive explosion */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <div className="text-4xl">🤯</div>
                <div className="text-xl font-black text-white font-mono">10,000,000+</div>
                <div className="text-xs text-slate-400 max-w-xs">
                  Possible thread interleavings for just 3 transactions. Fuzzing or random sleep
                  injection will only ever test a tiny fraction of the state space.
                </div>
              </motion.div>
            )}

            {/* Step 1: Independence Relation */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 w-full max-w-sm"
              >
                <div className="w-full grid grid-cols-2 gap-4 text-[10px] font-mono">
                  <div className="border border-white/10 bg-white/5 rounded p-3 flex flex-col gap-2">
                    <span className="text-teal-400 font-bold">Action A</span>
                    <span>T1 Reads Page 5</span>
                  </div>
                  <div className="border border-white/10 bg-white/5 rounded p-3 flex flex-col gap-2">
                    <span className="text-amber-400 font-bold">Action B</span>
                    <span>T2 Reads Page 9</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-white">
                  <div className="bg-slate-800 px-3 py-1 rounded">A → B</div>
                  <span className="text-slate-500">is identical to</span>
                  <div className="bg-slate-800 px-3 py-1 rounded">B → A</div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Because they don&apos;t interact, swapping their order does not change the
                  database state. This is an <b>Independence Relation</b>.
                </p>
              </motion.div>
            )}

            {/* Step 2: Trace Monoid / Equivalence Classes */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <div className="flex gap-4">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-teal-500/50 bg-teal-500/10 flex items-center justify-center flex-col relative group">
                    <span className="text-2xl font-black text-teal-500/30">1</span>
                    <span className="text-[10px] font-bold text-teal-400 absolute bottom-4">
                      Class Alpha
                    </span>
                  </div>
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-purple-500/50 bg-purple-500/10 flex items-center justify-center flex-col relative group">
                    <span className="text-2xl font-black text-purple-500/30">2</span>
                    <span className="text-[10px] font-bold text-purple-400 absolute bottom-4">
                      Class Beta
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 max-w-sm text-center">
                  A <FrankenJargon term="mazurkiewicz-trace">Mazurkiewicz Trace</FrankenJargon>{" "}
                  groups millions of interleavings into a single equivalence class. If we prove one
                  path in the class is safe, we have mathematically proven all of them are safe.
                </div>
              </motion.div>
            )}

            {/* Step 3: DPOR Execution */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-teal-500/20 border border-teal-500/50 text-teal-400 text-[10px] font-bold">
                    <span>Test Canonical Path (Class 1)</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-purple-500/20 border border-purple-500/50 text-purple-400 text-[10px] font-bold">
                    <span>Test Canonical Path (Class 2)</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700 text-slate-500 text-[10px] font-bold">
                    <span>Prune 9,999,998 redundant paths</span>
                    <Compass className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 max-w-sm text-center">
                  Dynamic Partial Order Reduction (<FrankenJargon term="dpor">DPOR</FrankenJargon>)
                  executes exactly one representative from each trace class. Exhaustive proof
                  without combinatorial explosion.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-2">
          <button
            onClick={reset}
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
          >
            Restart
          </button>

          <div className="flex gap-2">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs font-bold transition-all"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={step === 3}
              className="px-4 py-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500 text-xs font-black transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              This is a step-by-step explainer of how FrankenSQLite mathematically proves its
              concurrency engine is safe, without falling victim to combinatorial explosion.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next</strong>. The first step shows the problem: 3 transactions have
              10,000,000+ possible ways their instructions could interleave. Fuzzing will never
              catch them all.
            </p>
            <p>
              Click <strong>Next</strong> again. We define an &ldquo;Independence Relation&rdquo;.
              Since reading Page 5 and reading Page 9 do not interact, executing A then B produces
              the exact same database state as executing B then A.
            </p>
            <div>
              Click <strong>Next</strong>. By mathematically grouping these equivalent paths, we
              create <FrankenJargon term="mazurkiewicz-trace">Mazurkiewicz Traces</FrankenJargon>{" "}
              (equivalence classes). We don&apos;t need to test every path; we only need to test one
              canonical representative per class!
            </div>
            <div>
              Click <strong>Next</strong>. The engine uses{" "}
              <FrankenJargon term="dpor">Dynamic Partial Order Reduction (DPOR)</FrankenJargon> to
              test only the 2 canonical paths, instantly pruning 9,999,998 redundant ones.
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              Writing multi-threaded database engines is notoriously difficult because race
              conditions are impractical to test via random fuzzing. The probability of hitting the
              one fatal schedule by chance is vanishingly low.
            </div>
            <div>
              By applying <FrankenJargon term="mazurkiewicz-trace">trace theory</FrankenJargon> and{" "}
              <FrankenJargon term="dpor">DPOR</FrankenJargon> in its automated test harness,
              FrankenSQLite explores the entire theoretical state space, achieving mathematically
              proven confidence in its <FrankenJargon term="mvcc">MVCC</FrankenJargon> design.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
