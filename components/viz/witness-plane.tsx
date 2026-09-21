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
  type: "rw-antidependency" | "ww-dependency";
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
    setStep((s) => Math.max(s - 0, 0));
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
    edges.push({ id: "e1", from: "T1", to: "T2", type: "rw-antidependency" });
  }
  if (step >= 2) {
    edges.push({ id: "e2", from: "T2", to: "T3", type: "rw-antidependency" });
  }

  // Descriptions per step
  const stepInfo = [
    "Three concurrent transactions are running. They don't block each other with locks. Instead, the Witness Plane quietly records their activity.",
    "T1 read a page that T2 later modified. The Witness Plane records an 'RW-Antidependency' edge from T1 to T2. This is fine on its own.",
    "T2 read a different page that T3 later modified. Another RW-Antidependency edge is recorded. We now have a dangerous structure: T2 is a 'pivot' with both incoming and outgoing edges.",
    "At commit time, the validation engine detects this cycle (the Cahill/Fekete rule). To prevent a Write Skew anomaly, the engine aborts the pivot transaction (T2) mathematically guaranteeing serializability.",
  ];

  return (
    <VizContainer
      title="The Witness Plane"
      description="SSI doesn't use heavyweight locks to prevent anomalies. It uses a 'Witness Plane', a background graph that tracks read-write antidependencies. If a dangerous cycle forms, it aborts the offending transaction before corruption occurs."
      minHeight={420}
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
                          RW-Antidependency
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
                        Cahill/Fekete Rule Triggered
                      </div>
                      <div className="text-xs text-red-200">
                        Pivot transaction aborted. Write skew prevented.
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
              {step === 3 ? "Protected" : "Next Event"}
            </button>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a live dependency graph that the database engine maintains silently
              in the background, known as the{" "}
              <FrankenJargon term="witness-plane">Witness Plane</FrankenJargon>.
            </div>
            <p>
              In standard concurrency models, you either lock the data (which is slow) or you
              don&apos;t (which risks silent corruption). The Witness Plane offers a third way: it
              watches what transactions are doing and connects them with mathematically defined
              edges.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Next Event</strong> to step through time. You will see a red arrow form
              from T1 to T2. This is an{" "}
              <FrankenJargon term="rw-antidependency">RW-Antidependency</FrankenJargon>: it means T1
              read some data, and then T2 overwrote it.
            </p>
            <p>
              Click again. A second arrow forms from T2 to T3. Notice what happens to T2: it becomes
              a &ldquo;Pivot&rdquo; node. It has an arrow pointing in, and an arrow pointing out.
            </p>
            <div>
              Click one last time. The engine recognizes this specific graphical structure (
              <FrankenJargon term="cahill-fekete">The Cahill/Fekete Rule</FrankenJargon>) as
              mathematically dangerous, and it immediately aborts the pivot transaction to prevent
              corruption.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              Write Skew is a subtle database anomaly where no two transactions directly overwrite
              each other&apos;s data, but their combined results violate an application invariant
              (for example, two on-call doctors simultaneously taking the day off because each read
              that the other was still working). Traditional{" "}
              <FrankenJargon term="snapshot-isolation">Snapshot Isolation</FrankenJargon> does not
              prevent it.
            </p>
            <p>
              The Witness Plane prevents Write Skew without locks. Under{" "}
              <FrankenJargon term="ssi">Serializable Snapshot Isolation</FrankenJargon>, it allows
              full read/write concurrency to proceed unimpeded, intervening only at commit time when
              a dangerous <FrankenJargon term="rw-antidependency">RW-Antidependency</FrankenJargon>{" "}
              cycle forms in the dependency graph.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
