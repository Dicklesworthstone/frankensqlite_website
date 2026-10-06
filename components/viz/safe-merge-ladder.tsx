"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Combine, Database } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface CellRow {
  /** Cell key (the row's key), which identifies the cell independent of its byte offset. */
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
  data: CellRow[];
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
        <div key={r.id} className="flex flex-col items-center gap-1">
          <div
            className={`w-10 h-10 rounded flex items-center justify-center font-mono text-sm font-bold border transition-colors ${highlightIdx === i ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-white/10 text-slate-400"}`}
          >
            {r.val}
          </div>
          <span className="text-[9px] font-mono text-slate-500">cell {r.id}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

const CHECKS = [
  "Changed cell keys don't overlap (A vs C)",
  "Page header not changed by both sides",
  "Merged cells fit in the page",
  "Keys still in B-tree order",
];

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

  const t1Patch = [
    { id: "A", val: "15" },
    { id: "B", val: "·" },
    { id: "C", val: "·" },
  ];

  const t2Patch = [
    { id: "A", val: "·" },
    { id: "B", val: "·" },
    { id: "C", val: "80" },
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
      title="Structured Page Patch Merge"
      description="The second rung of the designed safe merge ladder: when two transactions changed different cells of the same page, combine the changes cell by cell. It is built and tested but not wired in. Today the live engine gives the later committer SQLITE_BUSY_SNAPSHOT and the application retries."
      minHeight={450}
      status="dormant"
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
                  title="Leaf Page 5 (v1)"
                  data={baseData}
                  color="border-slate-500/30 text-slate-400"
                />
                <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">
                  Two writers start from the same snapshot of this leaf page. Each cell is
                  identified by its key, not by where its bytes sit in the page.
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
                    title="T1's copy"
                    data={t1Data}
                    highlightIdx={0}
                    color="border-blue-500/50 text-blue-400"
                  />
                  <DataBlock
                    title="T2's copy"
                    data={t2Data}
                    highlightIdx={2}
                    color="border-amber-500/50 text-amber-400"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-8 text-center max-w-sm">
                  T1 changes cell A. T2 changes cell C. T1 commits first, so T2 hits base drift on
                  Page 5 when it tries to commit.
                </p>
              </motion.div>
            )}

            {/* Step 2: Per-cell patches */}
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
                    title="T1 patch (by cell)"
                    data={t1Patch}
                    highlightIdx={0}
                    color="border-blue-500/50 text-blue-400"
                  />
                  <DataBlock
                    title="T2 patch (by cell)"
                    data={t2Patch}
                    highlightIdx={2}
                    color="border-amber-500/50 text-amber-400"
                  />
                </div>
                <div className="text-xs text-slate-400 mt-4 text-center max-w-sm">
                  Both versions of the page are parsed into cells, and each change is written down
                  as &ldquo;cell key → new contents&rdquo;. (Rung 1,{" "}
                  <FrankenJargon term="deterministic-rebase">deterministic rebase</FrankenJargon>,
                  would be tried first; this rung is the fallback when rebase can&apos;t be used.)
                </div>
              </motion.div>
            )}

            {/* Step 3: Merge with checks */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full gap-4"
              >
                <div className="flex w-full justify-around max-w-md opacity-40 scale-90">
                  <DataBlock
                    title="T1 patch"
                    data={t1Patch}
                    highlightIdx={0}
                    color="border-blue-500/50 text-blue-400"
                  />
                  <DataBlock
                    title="T2 patch"
                    data={t2Patch}
                    highlightIdx={2}
                    color="border-amber-500/50 text-amber-400"
                  />
                </div>

                <Combine className="w-7 h-7 text-teal-500 animate-pulse" />

                <ul className="space-y-1 text-[11px] text-slate-300">
                  {CHECKS.map((c) => (
                    <li key={c} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
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
                  <CheckCircle2 className="w-6 h-6 text-orange-400" />
                  <span className="font-bold text-orange-300">Merged page (design)</span>
                </div>
                <DataBlock
                  title="Leaf Page 5 (v3)"
                  data={mergedData}
                  highlightIdx={-1}
                  color="border-orange-400/50 text-orange-300 bg-orange-950/20"
                />
                <p className="text-xs text-slate-300 mt-2 text-center max-w-sm">
                  The page is rebuilt from the merged cells and T2 commits on top of T1.
                  <br />
                  <span className="text-slate-500">
                    Today: T2 gets SQLITE_BUSY_SNAPSHOT and retries instead.
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Why not byte-level XOR */}
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            <strong className="text-red-300">Why not merge byte-level XOR deltas?</strong> The
            design rules it out for SQLite pages. If T1&apos;s change moves cell C to a new offset
            while T2 edits C&apos;s bytes at the old offset, the two byte ranges don&apos;t
            overlap, yet the merged page points at the moved copy and T2&apos;s update is lost.
            So merging works on parsed cells, never on raw bytes.
          </p>
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
              The second rung of FrankenSQLite&apos;s designed{" "}
              <FrankenJargon term="safe-merge-ladder">safe merge ladder</FrankenJargon>: a
              structured page patch merge.
            </div>
            <p>
              Two transactions (T1 and T2) start from the same version of a leaf page and change
              different cells. T1 commits first. Without a merge, T2 must be aborted and retried
              even though the two changes never touched the same row.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next</strong> to step through. T1 edits cell A and T2 edits cell C.
            </p>
            <p>
              The engine parses both versions of the page into cells keyed by their row key, works
              out which cells each side changed, and confirms the sets don&apos;t overlap. It then
              rebuilds the page with both changes and checks it: page-header changes from both
              sides may not mix, the cells must fit, and the B-tree ordering must hold. If any
              check fails, the ladder falls through to abort and retry.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Page-level MVCC treats any two writes to the same{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> page as a conflict, even when
              they touched different rows. A merge like this could save the retry.
            </div>
            <div>
              It is dormant today. The code lives in <code>fsqlite-mvcc</code> and is tested, but
              the commit path never calls it, and its effect on real workloads has not been
              measured. Byte-level XOR merging is explicitly ruled out, because a cell move can
              make two byte-disjoint edits lose an update.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
