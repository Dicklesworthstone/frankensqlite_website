"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface WitnessEdge {
  id: string;
  from: string;
  to: string;
  type: "rw-antidependency";
  /** Page whose read/write witnesses produced this edge. */
  page: number;
}

export default function WitnessPlane() {
  const { playSfx } = useSite();
  const [step, setStep] = useState(0);

  const nextStep = () => {
    playSfx("click");
    setStep((s) => Math.min(s + 1, 3));
  };
  const prevStep = () => {
    playSfx("click");
    setStep((s) => Math.max(s - 1, 0));
  };
  const reset = () => {
    playSfx("click");
    setStep(0);
  };

  // Nodes for the graph
  const nodes = [
    {
      id: "T1",
      label: "Txn 1",
      pos: { x: 50, y: 120 },
      color: "border-blue-500 text-blue-400 bg-blue-500/10",
    },
    {
      id: "T2",
      label: "Txn 2",
      pos: { x: 200, y: 120 },
      color: "border-amber-500 text-amber-400 bg-amber-500/10",
    },
    {
      id: "T3",
      label: "Txn 3",
      pos: { x: 350, y: 120 },
      color: "border-purple-500 text-purple-400 bg-purple-500/10",
    },
  ];

  // Edges based on step
  const edges: WitnessEdge[] = [];
  if (step >= 1) {
    edges.push({ id: "e1", from: "T1", to: "T2", type: "rw-antidependency", page: 4 });
  }
  if (step >= 2) {
    edges.push({ id: "e2", from: "T2", to: "T3", type: "rw-antidependency", page: 9 });
  }

  // Descriptions per step
  const stepInfo = [
    "Three concurrent transactions are running. Reads take no locks. As they run, the engine records witnesses: which pages each transaction read and which pages it wrote.",
    "T1 read page 4, and T2 writes page 4. T1 saw the version from before T2's change, so in any equivalent serial order T1 must come before T2. That is a read-write antidependency, T1 → T2. One edge on its own is harmless.",
    "T2 read page 9, and T3 writes page 9: another edge, T2 → T3. T2 now has an rw edge coming in and one going out. Cahill and Fekete showed that every snapshot-isolation anomaly contains a transaction like this, called a pivot.",
    "When T2 tries to commit, validation finds both edges and aborts it with SQLITE_BUSY_SNAPSHOT; the application retries it. The rule does not wait to see whether a full cycle forms (an edge T3 → T1 would close one), and it tracks pages rather than rows, so some of these aborts turn out to be unnecessary. It errs toward a retry rather than letting an anomaly through.",
  ];

  return (
    <VizContainer
      title="The Witness Plane"
      description="SSI does not lock rows to prevent anomalies. It keeps a record of what each transaction read and wrote, which the engine calls its witness plane, and uses it to find read-write antidependencies. A transaction that ends up with one coming in and one going out is aborted and retried."
      minHeight={420}
      status="live"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative overflow-hidden">
        {/* Viz Area */}
        <div className="flex-1 relative flex items-center justify-center min-h-[220px]">
          <div className="w-full overflow-x-auto touch-pan-x scrollbar-hide flex items-center justify-center h-full">
            <div className="relative w-[450px] md:w-full max-w-[450px] h-[240px] shrink-0">
              {/* Draw Edges */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                  </marker>
                </defs>
                <AnimatePresence>
                  {edges.map((edge) => {
                    const fromNode = nodes.find((n) => n.id === edge.from)!;
                    const toNode = nodes.find((n) => n.id === edge.to)!;

                    // Simple path connecting nodes
                    const startX = fromNode.pos.x + 40; // right edge
                    const startY = fromNode.pos.y;
                    const endX = toNode.pos.x - 40; // left edge
                    const endY = toNode.pos.y;

                    return (
                      <motion.g
                        key={edge.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <path
                          d={`M ${startX} ${startY} L ${endX - 5} ${endY}`}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          markerEnd="url(#arrowhead)"
                        />
                        <rect
                          x={(startX + endX) / 2 - 35}
                          y={startY - 25}
                          width="70"
                          height="14"
                          fill="#000"
                          rx="2"
                        />
                        <text
                          x={(startX + endX) / 2}
                          y={startY - 16}
                          fill="#ef4444"
                          fontSize="8"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          rw edge · page {edge.page}
                        </text>
                      </motion.g>
                    );
                  })}
                </AnimatePresence>
              </svg>

              {/* Draw Nodes */}
              {nodes.map((node) => {
                const isPivot = node.id === "T2";
                const isAborted = isPivot && step === 3;

                return (
                  <motion.div
                    key={node.id}
                    className={`absolute flex flex-col items-center justify-center w-20 h-20 -ml-10 -mt-10 rounded-full border-2 ${node.color} shadow-lg z-10 bg-[#050505]`}
                    style={{ left: node.pos.x, top: node.pos.y }}
                    animate={
                      isAborted
                        ? {
                            scale: 0.9,
                            opacity: 0.5,
                            borderColor: "#ef4444",
                            backgroundColor: "rgba(239,68,68,0.1)",
                            color: "#ef4444",
                          }
                        : { scale: 1 }
                    }
                  >
                    <span className="text-xs font-bold">{node.label}</span>
                    {isPivot && step >= 2 && !isAborted && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-red-400 mt-1 bg-red-950/50 px-1 rounded">
                        Pivot
                      </span>
                    )}
                    {isAborted && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-1">
                        Aborted
                      </span>
                    )}
                  </motion.div>
                );
              })}

              {/* Step 3 Alert Overlay */}
              <AnimatePresence>
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-3 backdrop-blur"
                  >
                    <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-red-400">
                        Pivot found at commit
                      </div>
                      <div className="text-xs text-red-200">
                        T2 gets SQLITE_BUSY_SNAPSHOT and is retried.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Narrative Panel */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex gap-4 items-start">
          <Eye className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed flex-1">{stepInfo[step]}</p>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4">
          <button
            onClick={reset}
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none rounded px-2 py-1"
          >
            Reset
          </button>

          <div className="flex gap-2">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={step === 3}
              className="px-4 py-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500 text-xs font-black transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
            >
              {step === 3 ? "Done" : "Next Event"}
            </button>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              A dependency graph built from the engine&apos;s{" "}
              <FrankenJargon term="witness-plane">witness plane</FrankenJargon>, its name for the
              read and write evidence that SSI works from.
            </div>
            <p>
              In the current runtime the evidence is kept per page: a read records the page in a
              sharded table of readers, and a write records the page as a write witness. Edges are
              not drawn by a background process. They are found when a transaction commits, by
              comparing its pages with those of the other transactions still in flight. Finer keys
              (single cells or key ranges) and evidence shared across processes are part of the
              design, not the live path.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next Event</strong> to step through time. A red arrow forms from T1 to
              T2. This is an{" "}
              <FrankenJargon term="rw-antidependency">rw-antidependency</FrankenJargon>: T1 read a
              page that T2 writes, so T1 did not see T2&apos;s change.
            </p>
            <p>
              Click again. A second arrow forms from T2 to T3, and T2 becomes a pivot: one arrow in,
              one arrow out.
            </p>
            <div>
              Click once more. At commit, the engine applies the conservative{" "}
              <FrankenJargon term="cahill-fekete">Cahill/Fekete rule</FrankenJargon>: a
              transaction with an rw edge in and an rw edge out is aborted with{" "}
              <code>SQLITE_BUSY_SNAPSHOT</code>, and the application retries it.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              Write skew is an anomaly where no two transactions overwrite each other&apos;s data,
              but together they break a rule the application relies on. The textbook example is
              two on-call doctors who each check that the other is still on call and then both sign
              off. Plain{" "}
              <FrankenJargon term="snapshot-isolation">snapshot isolation</FrankenJargon> does not
              prevent it.
            </p>
            <p>
              <FrankenJargon term="ssi">Serializable Snapshot Isolation</FrankenJargon> prevents it
              without making readers lock rows. Reads and writes proceed normally and the check
              runs at commit. The price is some unnecessary aborts, because the rule does not wait
              for a full cycle and works at page granularity. FrankenSQLite turns SSI on by
              default; <code>PRAGMA fsqlite.serializable = OFF</code> drops back to plain snapshot
              isolation.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
