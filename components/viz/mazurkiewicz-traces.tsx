"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Compass, Shuffle } from "lucide-react";
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
      description="Schedules that differ only in the order of independent steps behave the same. Mazurkiewicz traces group them into equivalence classes, so a checker can test one schedule per class instead of every interleaving. FrankenSQLite's test harness does this for small models of concurrent transactions; the results hold for the modeled steps and the bounds of each test."
      minHeight={450}
      status="harness"
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
                <Shuffle className="w-8 h-8 text-slate-500" />
                <div className="text-xl font-black text-white font-mono">20</div>
                <div className="text-xs text-slate-400 max-w-xs">
                  Ways to interleave two transactions of three steps each (T1: read P1, write P2,
                  commit. T2: read P3, write P4, commit). A third such transaction raises the count
                  to 1,680. Random scheduling only samples some of them.
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
                  They touch different pages, so swapping them does not change what either
                  transaction sees. Pairs like this make up the <b>independence relation</b>. A read
                  and a write of the same page, two commits, or two BEGINs do depend on order.
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
                      T1 commits first
                    </span>
                  </div>
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-purple-500/50 bg-purple-500/10 flex items-center justify-center flex-col relative group">
                    <span className="text-2xl font-black text-purple-500/30">2</span>
                    <span className="text-[10px] font-bold text-purple-400 absolute bottom-4">
                      T2 commits first
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 max-w-sm text-center">
                  In this example the only steps that depend on each other are the two commits, so
                  the 20 interleavings fall into 2{" "}
                  <FrankenJargon term="mazurkiewicz-trace">Mazurkiewicz traces</FrankenJargon>, one
                  per commit order. Every schedule in a class behaves the same under the modeled
                  independence relation.
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
                    <span>Check one schedule (T1 commits first)</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-purple-500/20 border border-purple-500/50 text-purple-400 text-[10px] font-bold">
                    <span>Check one schedule (T2 commits first)</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700 text-slate-500 text-[10px] font-bold">
                    <span>Skip 18 equivalent interleavings</span>
                    <Compass className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 max-w-sm text-center">
                  Partial order reduction (<FrankenJargon term="dpor">DPOR</FrankenJargon> is the
                  dynamic version) checks one schedule per class: 2 checks instead of 20 here. With
                  many conflicting steps there are many classes, so the work can still grow
                  quickly.
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
              This is a step-by-step walk through one small example: how equivalent schedules are
              grouped, and why a checker only needs one schedule from each group. The example and
              its counts (20 interleavings, 2 classes) come from a test in FrankenSQLite&apos;s
              harness.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next</strong>. Two transactions with three steps each can interleave in
              20 ways. The count multiplies quickly as transactions and steps are added.
            </p>
            <p>
              Click <strong>Next</strong> again. Some pairs of steps are independent: reading page
              5 and reading page 9 give the same result in either order.
            </p>
            <div>
              Click <strong>Next</strong>. Swapping independent neighbors turns one schedule into
              another equivalent one. The resulting groups are{" "}
              <FrankenJargon term="mazurkiewicz-trace">Mazurkiewicz traces</FrankenJargon>. Here
              only the commit order matters, so there are two.
            </div>
            <div>
              Click <strong>Next</strong>. The checker runs one schedule per class and skips the
              other 18, which by construction behave like one of those two.
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              Concurrency bugs often hide in one rare ordering. Grouping equivalent schedules lets
              a test cover every distinct ordering of a small scenario instead of hoping random
              runs hit the bad one.
            </div>
            <div>
              Where it stands: this lives in the test harness, not the database runtime.{" "}
              <code>fsqlite-harness</code> models transactions as begin/read/write/commit steps,
              puts each schedule into a canonical (Foata) form, and checks one representative per
              class against <FrankenJargon term="mvcc">MVCC</FrankenJargon> invariants. For some
              concurrent data structures it also runs the asupersync lab runtime&apos;s{" "}
              <FrankenJargon term="dpor">DPOR</FrankenJargon> explorer with a step limit. Coverage
              is complete only for the modeled steps and bounds of each test, and only if the
              independence relation is right.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
