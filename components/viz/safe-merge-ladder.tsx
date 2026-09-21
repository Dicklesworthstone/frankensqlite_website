"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Combine, Database } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface RecordRow {
  id: string;
  val: number | string;
}

const DataBlock = ({
  title,
  data,
  highlightIdx,
  color,
}: {
  title: string;
  data: RecordRow[];
  highlightIdx?: number;
  color: string;
}) => (
  <motion.div
    layout
    className={`rounded-xl border p-3 flex flex-col items-center bg-black/50 ${color}`}
  >
    <span className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-80">{title}</span>
    <div className="flex gap-2">
      {data.map((r, i) => (
        <div
          key={r.id}
          className={`w-10 h-10 rounded flex items-center justify-center font-mono text-sm font-bold border transition-colors ${highlightIdx === i ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-white/10 text-slate-400"}`}
        >
          {r.val}
        </div>
      ))}
    </div>
  </motion.div>
);

export default function SafeMergeLadder() {
  const [step, setStep] = useState(0);

  // States
  const baseData = [
    { id: "A", val: 10 },
    { id: "B", val: 50 },
    { id: "C", val: 90 },
  ];

  const t1Data = [
    { id: "A", val: 15 }, // changed
    { id: "B", val: 50 },
    { id: "C", val: 90 },
  ];

  const t2Data = [
    { id: "A", val: 10 },
    { id: "B", val: 50 },
    { id: "C", val: 80 }, // changed
  ];

  const t1Delta = [
    { id: "A", val: "+5" },
    { id: "B", val: " 0" },
    { id: "C", val: " 0" },
  ];

  const t2Delta = [
    { id: "A", val: " 0" },
    { id: "B", val: " 0" },
    { id: "C", val: "-10" },
  ];

  const mergedData = [
    { id: "A", val: 15 },
    { id: "B", val: 50 },
    { id: "C", val: 80 },
  ];

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));
  const reset = () => setStep(0);

  return (
    <VizContainer
      title="XOR Delta Merge"
      description="When two transactions edit different rows on the same physical B-Tree page, standard SQLite throws a SQLITE_BUSY error. FrankenSQLite uses byte-level XOR deltas to safely merge the changes."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between">
        {/* Viz Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
          <AnimatePresence mode="popLayout">
            {/* Step 0: Base */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <Database className="w-10 h-10 text-slate-500 opacity-50" />
                <DataBlock
                  title="Base Page (v1)"
                  data={baseData}
                  color="border-slate-500/30 text-slate-400"
                />
                <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">
                  Two writers start from the exact same snapshot.
                </p>
              </motion.div>
            )}

            {/* Step 1: Branching */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full"
              >
                <div className="flex w-full justify-around max-w-md">
                  <DataBlock
                    title="Txn 1 Write"
                    data={t1Data}
                    highlightIdx={0}
                    color="border-blue-500/50 text-blue-400"
                  />
                  <DataBlock
                    title="Txn 2 Write"
                    data={t2Data}
                    highlightIdx={2}
                    color="border-amber-500/50 text-amber-400"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-8 text-center max-w-sm">
                  T1 updates record A. T2 updates record C. They both try to commit to the same page
                  at the same time.
                </p>
              </motion.div>
            )}

            {/* Step 2: Deltas */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full gap-4"
              >
                <div className="flex w-full justify-around max-w-md">
                  <DataBlock
                    title="T1 Delta (T1 ⊕ Base)"
                    data={t1Delta}
                    highlightIdx={0}
                    color="border-blue-500/50 text-blue-400"
                  />
                  <DataBlock
                    title="T2 Delta (T2 ⊕ Base)"
                    data={t2Delta}
                    highlightIdx={2}
                    color="border-amber-500/50 text-amber-400"
                  />
                </div>
                <div className="text-xs text-slate-400 mt-4 text-center max-w-sm">
                  The engine computes the byte-level{" "}
                  <FrankenJargon term="xor-delta">XOR delta</FrankenJargon> for both writes against
                  the base page.
                </div>
              </motion.div>
            )}

            {/* Step 3: Merge */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full gap-6"
              >
                <div className="flex w-full justify-around max-w-md opacity-40 scale-90">
                  <DataBlock
                    title="T1 Delta"
                    data={t1Delta}
                    highlightIdx={0}
                    color="border-blue-500/50 text-blue-400"
                  />
                  <DataBlock
                    title="T2 Delta"
                    data={t2Delta}
                    highlightIdx={2}
                    color="border-amber-500/50 text-amber-400"
                  />
                </div>

                <Combine className="w-8 h-8 text-teal-500 animate-pulse" />

                <DataBlock
                  title="Merged Delta"
                  data={[
                    { id: "A", val: "+5" },
                    { id: "B", val: " 0" },
                    { id: "C", val: "-10" },
                  ]}
                  color="border-teal-500/50 text-teal-400"
                />
              </motion.div>
            )}

            {/* Step 4: Result */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full gap-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="font-bold text-emerald-400">Safe Merge Complete</span>
                </div>
                <DataBlock
                  title="Final Page (v3)"
                  data={mergedData}
                  highlightIdx={-1}
                  color="border-emerald-500/50 text-emerald-400 bg-emerald-950/30"
                />
                <p className="text-xs text-slate-300 mt-4 text-center max-w-sm">
                  Base ⊕ T1_Delta ⊕ T2_Delta = Final Page. <br /> Both transactions succeed!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-4">
          <button
            onClick={reset}
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
          >
            Reset
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
              disabled={step === 4}
              className="px-4 py-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500 text-xs font-black transition-all"
            >
              {step === 4 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a visualization of the{" "}
              <FrankenJargon term="xor-delta">XOR Delta Merge</FrankenJargon>, which is the third
              rung of FrankenSQLite&apos;s{" "}
              <FrankenJargon term="safe-merge-ladder">Safe Merge Ladder</FrankenJargon>.
            </div>
            <p>
              We have two transactions (T1 and T2) that both started from the same Base Page (v1).
              They both try to commit to the exact same physical B-tree page at the exact same time.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next</strong> to watch the pipeline. In Step 1, T1 edits Record A, and
              T2 edits Record C.
            </p>
            <div>
              In standard SQLite, one of these would immediately trigger a <code>SQLITE_BUSY</code>{" "}
              error and abort. But click Next again: FrankenSQLite calculates a byte-level
              mathematical difference (<FrankenJargon term="xor-delta">XOR Delta</FrankenJargon>)
              between their edits and the base page.
            </div>
            <p>
              Because their deltas do not overlap on the same bytes, the engine can literally XOR
              them together to produce a perfectly valid, combined &ldquo;v3&rdquo; page. Both
              transactions succeed!
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              In highly concurrent systems, multiple threads frequently land on the same physical{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> page even if they are editing
              completely different logical rows (false sharing).
            </div>
            <div>
              By using the <FrankenJargon term="safe-merge-ladder">Safe Merge Ladder</FrankenJargon>{" "}
              (which tries Intent Replay, <FrankenJargon term="foata">FOATA</FrankenJargon>{" "}
              reordering, and <FrankenJargon term="xor-delta">XOR delta</FrankenJargon> merging
              before falling back to{" "}
              <FrankenJargon term="deterministic-rebase">deterministic rebase</FrankenJargon>), the
              engine converts over 90% of what would otherwise be aborted transactions into
              invisible background merges.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
