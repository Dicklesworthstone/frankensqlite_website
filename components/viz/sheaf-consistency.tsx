"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

export default function SheafConsistency() {
  const [step, setStep] = useState(0);

  // Each transaction's "section": the version of each page it read.
  // T1 and T3 agree on B. T2 saw an older B than T3, which is fine (an older snapshot).
  // T1 and T2 cross: T1 saw the older A but the newer B, T2 the reverse. Each page
  // on its own can be ordered, but no single commit order yields both snapshots,
  // so the pair is an obstruction.

  return (
    <VizContainer
      title="Sheaf-Theoretic Consistency"
      description="Treat each transaction's reads as a local view, then ask whether every pair of overlapping views could come from one history of commits. FrankenSQLite's test harness runs this check on synthetic transaction views. It is a model check, not part of the database runtime and not a proof of isolation."
      minHeight={450}
      status="harness"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 justify-between relative">
        {/* Step Indicator */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-12 rounded-full transition-colors ${s <= step ? "bg-teal-500" : "bg-white/10"}`}
            />
          ))}
        </div>

        {/* Viz Area */}
        <div className="flex-1 relative flex items-center justify-center min-h-[250px]">
          {/* T1 */}
          <TxnView
            id="T1"
            pos="-translate-x-24 -translate-y-12"
            data={[
              { k: "A", v: "v1" },
              { k: "B", v: "v2" },
            ]}
            color="border-blue-500/50 bg-blue-500/10 text-blue-400"
            active={step >= 0}
          />

          {/* T2 */}
          <TxnView
            id="T2"
            pos="translate-x-24 -translate-y-12"
            data={[
              { k: "A", v: "v2" },
              { k: "B", v: "v1" },
            ]}
            color="border-amber-500/50 bg-amber-500/10 text-amber-400"
            active={step >= 0}
          />

          {/* T3 */}
          <TxnView
            id="T3"
            pos="translate-y-20"
            data={[
              { k: "B", v: "v2" },
              { k: "C", v: "v1" },
            ]}
            color="border-purple-500/50 bg-purple-500/10 text-purple-400"
            active={step >= 0}
          />

          {/* Pair checks. Coordinates are pixel offsets from the center of this area. */}
          <AnimatePresence>
            {step >= 1 && <HighlightLine key="t1-t3" d="M -70 -6 L -30 38" ok />}
            {step >= 1 && <HighlightLine key="t2-t3" d="M 70 -6 L 30 38" ok />}
            {step === 2 && <HighlightLine key="t1-t2" d="M -48 -48 L 48 -48" ok={false} />}
          </AnimatePresence>

          {/* Obstruction (Step 2) */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute z-20 flex flex-col items-center justify-center p-4 rounded-xl border border-red-500/50 bg-red-950/80 shadow-[0_0_50px_rgba(239,68,68,0.3)] backdrop-blur-sm"
              >
                <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
                <div className="text-sm font-black text-white uppercase tracking-widest">
                  Obstruction: T1 and T2
                </div>
                <div className="text-[10px] text-red-200 mt-1 max-w-[220px] text-center">
                  T1 saw the older A but the newer B. T2 saw the reverse. <br /> No commit order
                  produces both snapshots.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Narrative / Controls */}
        <div className="flex gap-4 items-center border-t border-white/10 pt-4">
          <div className="flex-1 text-xs text-slate-300 font-medium">
            {step === 0 &&
              "1. Each transaction's section: the version of each page it read (v1 is older than v2)."}
            {step === 1 &&
              "2. T1 and T3 saw the same B. T2 saw an older B than T3, which is fine: T2's snapshot is just older. Both pairs can be ordered."}
            {step === 2 &&
              "3. T1 and T2 share A and B. Each page alone can be ordered, but together they cross, so the checker reports an obstruction."}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              disabled={step === 0}
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold disabled:opacity-30"
            >
              Reset
            </button>
            <button
              onClick={() => setStep((s) => Math.min(s + 1, 2))}
              disabled={step === 2}
              className="px-3 py-1.5 rounded bg-teal-500 text-black hover:bg-teal-400 text-xs font-bold disabled:opacity-30"
            >
              Next Step
            </button>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at three transactions&apos; read sets. In{" "}
              <FrankenJargon term="sheaf-theoretic">sheaf</FrankenJargon> terms each box is a
              &ldquo;local section&rdquo;: for every page the transaction read, the version it saw.
            </div>
            <div>
              Under <FrankenJargon term="snapshot-isolation">snapshot isolation</FrankenJargon>{" "}
              every snapshot is a prefix of one commit history, so for any two transactions one
              snapshot must be at least as new as the other on every page they share.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next Step</strong>. The checker compares every pair that shares a page.
              T1 and T3 saw the same version of B. T2 saw an older B than T3; that is allowed,
              since T2 simply started earlier.
            </p>
            <p>
              Click <strong>Next Step</strong> again. T1 and T2 share A and B. Looked at one page at
              a time, nothing is wrong: different transactions can see different versions. Looked
              at together, T1 is newer on B but older on A, and T2 is the reverse. No single commit
              order gives both views, so the pair is reported as an obstruction, the sign of a torn
              snapshot.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Concurrency bugs in an <FrankenJargon term="mvcc">MVCC</FrankenJargon> engine often
              return slightly wrong data instead of crashing. A per-page check would miss the
              crossing above; comparing all shared pages of a pair at once catches it.
            </div>
            <div>
              Where it stands: <code>check_sheaf_consistency</code> in <code>fsqlite-mvcc</code>{" "}
              performs this pairwise check (optionally against explicit version chains). The test
              harness calls it on synthetic sections; it does not open database connections, and
              the database runtime never calls it. Real SQL histories are checked separately by
              the harness&apos;s serializability oracle and concurrency tests. A full
              &ldquo;gluing&rdquo; check across all views at once remains a research goal.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}

function TxnView({
  id,
  pos,
  data,
  color,
  active,
}: {
  id: string;
  pos: string;
  data: Record<string, string | number>[];
  color: string;
  active: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: active ? 1 : 0.4, scale: active ? 1 : 0.8 }}
      className={`absolute ${pos} flex flex-col p-3 rounded-xl border ${color} shadow-lg z-10 w-24`}
    >
      <div className="text-[10px] font-black mb-2 opacity-80 border-b border-current pb-1">
        {id} Local View
      </div>
      {data.map((d) => (
        <div key={d.k} className="font-mono text-xs flex justify-between">
          <span>{d.k}</span>
          <span className="font-bold opacity-100">{d.v}</span>
        </div>
      ))}
    </motion.div>
  );
}

function HighlightLine({ d, ok }: { d: string; ok: boolean }) {
  return (
    // A 1x1 SVG pinned to the center of the area, so path coordinates are pixel
    // offsets from the center (matching the translate-* positions of the views).
    <motion.svg
      className="absolute left-1/2 top-1/2 w-px h-px pointer-events-none z-0"
      style={{ overflow: "visible" }}
      exit={{ opacity: 0 }}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={ok ? "#10b981" : "#ef4444"}
        strokeWidth="2"
        strokeDasharray="4 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
    </motion.svg>
  );
}
