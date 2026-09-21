"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

export default function SheafConsistency() {
  const [step, setStep] = useState(0);

  // Define the local sections (observations) for 3 transactions.
  // This creates a classic "phantom global commit" or topological obstruction.
  // T1 sees A=1, B=1
  // T2 sees B=1, C=2
  // T3 sees C=2, A=2
  // Pairwise, they agree on overlaps (T1-T2 agree on B=1. T2-T3 agree on C=2).
  // But A=1 and A=2 contradict globally if they belong to the same logical snapshot.

  return (
    <VizContainer
      title="Sheaf-Theoretic Consistency"
      description="Standard test harnesses check if pairs of transactions agree. FrankenSQLite uses sheaf theory to prove that all local 'sections' (transaction views) can be glued into a single, valid global state, catching mathematically subtle anomalies."
      minHeight={450}
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
              { k: "A", v: 1 },
              { k: "B", v: 1 },
            ]}
            color="border-blue-500/50 bg-blue-500/10 text-blue-400"
            active={step >= 0}
          />

          {/* T2 */}
          <TxnView
            id="T2"
            pos="translate-x-24 -translate-y-12"
            data={[
              { k: "B", v: 1 },
              { k: "C", v: 2 },
            ]}
            color="border-amber-500/50 bg-amber-500/10 text-amber-400"
            active={step >= 0}
          />

          {/* T3 */}
          <TxnView
            id="T3"
            pos="translate-y-20"
            data={[
              { k: "C", v: 2 },
              { k: "A", v: 2 },
            ]}
            color="border-purple-500/50 bg-purple-500/10 text-purple-400"
            active={step >= 0}
          />

          {/* Overlap Highlights (Step 1) */}
          <AnimatePresence>
            {step === 1 && (
              <>
                <HighlightLine key="line1" d="M -50 -30 L 50 -30" ok />
                <HighlightLine key="line2" d="M 60 10 L 10 70" ok />
                <HighlightLine key="line3" d="M -60 10 L -10 70" ok={false} />
              </>
            )}
          </AnimatePresence>

          {/* Global Obstruction (Step 2) */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute z-20 flex flex-col items-center justify-center p-4 rounded-xl border border-red-500/50 bg-red-950/80 shadow-[0_0_50px_rgba(239,68,68,0.3)] backdrop-blur-sm"
              >
                <ShieldAlert className="w-10 h-10 text-red-500 mb-2" />
                <div className="text-sm font-black text-white uppercase tracking-widest">
                  Global Obstruction Detected
                </div>
                <div className="text-[10px] text-red-200 mt-1 max-w-[200px] text-center">
                  Local sections cannot be glued into a global state. <br /> A = 1 AND A = 2.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Narrative / Controls */}
        <div className="flex gap-4 items-center border-t border-white/10 pt-4">
          <div className="flex-1 text-xs text-slate-300 font-medium">
            {step === 0 &&
              "1. Three concurrent transactions record their 'local sections' (read sets)."}
            {step === 1 &&
              "2. Pairwise testing: T1 and T2 agree on B. T2 and T3 agree on C. Standard testers would pass this."}
            {step === 2 &&
              "3. Sheaf condition failure: When we try to 'glue' T3 and T1, they disagree on A. A phantom global commit is caught!"}
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
            <p>
              You are looking at three independent transaction views (or &ldquo;local
              sections&rdquo;) floating in space. Each box represents what that specific transaction
              &ldquo;saw&rdquo; when it queried the database.
            </p>
            <p>
              This demonstrates a classic testing problem in distributed and highly concurrent
              systems: verifying that the entire system is actually consistent without stopping the
              world to check.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next Step</strong>. The system performs a standard pairwise check. It
              compares T1 and T2, and they both agree that <code>B=1</code>. It compares T2 and T3,
              and they both agree that <code>C=2</code>. A naive test harness would declare the
              database perfectly healthy and consistent.
            </p>
            <div>
              Click <strong>Next Step</strong> again. FrankenSQLite applies a{" "}
              <FrankenJargon term="sheaf-theoretic">Sheaf-Theoretic</FrankenJargon> global glue
              operation. It discovers that T1 saw <code>A=1</code>, but T3 saw <code>A=2</code>.
              Because they are part of the same logical snapshot, this is a mathematical
              contradiction: a &ldquo;Phantom Global Commit&rdquo; that standard tests completely
              missed!
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              Writing a concurrent <FrankenJargon term="mvcc">MVCC</FrankenJargon> database engine
              is difficult because subtle interleaving bugs often do not crash the program; they
              silently return the wrong data under heavy load.
            </div>
            <div>
              By applying <FrankenJargon term="sheaf-theoretic">sheaf-theoretic</FrankenJargon>{" "}
              global consistency checks in its automated testing harness, FrankenSQLite proves that
              its <FrankenJargon term="snapshot-isolation">snapshot isolation</FrankenJargon> model
              is correct, catching anomalies that fuzzing and pairwise assertions are blind to.
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
    <motion.svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ overflow: "visible" }}
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
      {/* Label would be tricky to position exactly with SVG text without complex math, but we can do a rough approximation or skip it. */}
    </motion.svg>
  );
}
