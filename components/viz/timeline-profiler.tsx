"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface TimelineEvent {
  id: string;
  time: number; // percentage 0-100
  type: "begin" | "read" | "write" | "savepoint" | "rollback" | "commit";
  label: string;
}

export default function TimelineProfiler() {
  const [activeTab, setActiveTab] = useState<"healthy" | "antipattern">("healthy");

  const healthyEvents: TimelineEvent[] = [
    { id: "h1", time: 5, type: "begin", label: "BEGIN" },
    { id: "h2", time: 20, type: "read", label: "SELECT (idx_users)" },
    { id: "h3", time: 35, type: "read", label: "SELECT (users)" },
    { id: "h4", time: 50, type: "write", label: "UPDATE (users)" },
    { id: "h5", time: 80, type: "commit", label: "COMMIT" },
  ];

  const antipatternEvents: TimelineEvent[] = [
    { id: "a1", time: 5, type: "begin", label: "BEGIN" },
    { id: "a2", time: 15, type: "read", label: "SELECT" },
    { id: "a3", time: 30, type: "savepoint", label: "SAVEPOINT 1" },
    { id: "a4", time: 45, type: "write", label: "INSERT" },
    { id: "a5", time: 60, type: "savepoint", label: "SAVEPOINT 2" },
    { id: "a6", time: 70, type: "write", label: "UPDATE" },
    { id: "a7", time: 85, type: "rollback", label: "ROLLBACK TO 1" },
    { id: "a8", time: 95, type: "commit", label: "COMMIT" },
  ];

  const events = activeTab === "healthy" ? healthyEvents : antipatternEvents;

  const getEventColor = (type: string) => {
    switch (type) {
      case "begin":
        return "bg-blue-500";
      case "commit":
        return "bg-emerald-500";
      case "read":
        return "bg-teal-500";
      case "write":
        return "bg-amber-500";
      case "savepoint":
        return "bg-purple-500";
      case "rollback":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <VizContainer
      title="Transaction Observability"
      description="Database tuning usually requires expensive external APM agents. FrankenSQLite has built-in transaction profiling via PRAGMA fsqlite.txn_timeline_json. It emits Chrome DevTools-compatible traces and actively advises you on anti-patterns."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("healthy")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "healthy" ? "bg-teal-500/20 text-teal-400 border border-teal-500/50" : "bg-transparent text-slate-500 hover:bg-white/5 border border-transparent"}`}
          >
            Healthy Transaction
          </button>
          <button
            onClick={() => setActiveTab("antipattern")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "antipattern" ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-transparent text-slate-500 hover:bg-white/5 border border-transparent"}`}
          >
            Anti-Pattern Detected
          </button>
        </div>

        {/* Timeline Chart */}
        <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl p-6 relative flex flex-col justify-center">
          <div className="relative h-20 w-full mb-8">
            {/* Base line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 rounded" />

            {/* Events */}
            <AnimatePresence mode="wait">
              {events.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center group cursor-default"
                  style={{ left: `${ev.time}%` }}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-black z-10 ${getEventColor(ev.type)} shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover:scale-150 transition-transform`}
                  />

                  <div
                    className={`absolute top-6 whitespace-nowrap text-[9px] font-bold px-2 py-1 rounded bg-black/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${ev.type === "rollback" ? "text-red-400" : "text-slate-300"}`}
                  >
                    {ev.label}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* JSON Output Snippet */}
          <div className="bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-[10px] text-slate-400 overflow-x-auto">
            <div className="text-teal-500/50 mb-2">{"// PRAGMA fsqlite.txn_timeline_json"}</div>
            <AnimatePresence mode="wait">
              {activeTab === "healthy" ? (
                <motion.pre
                  key="json-h"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {`{
  "txn_id": 104859,
  "duration_ms": 12.4,
  "operations": 5,
  "advisor_warnings": []
}`}
                </motion.pre>
              ) : (
                <motion.pre
                  key="json-a"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {`{
  "txn_id": 104860,
  "duration_ms": 845.1,
  "operations": 8,
  "advisor_warnings": [
    "LONG_TXN: Transaction held snapshot for > 500ms",
    "ROLLBACK_PRESSURE: Deep savepoint rollback discards MVCC state"
  ]
}`}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Advisor Panel */}
        <AnimatePresence mode="wait">
          {activeTab === "healthy" ? (
            <motion.div
              key="adv-h"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 flex gap-4 items-center"
            >
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-1">
                  Engine Advisor
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Transaction is crisp and short-lived. No excessive locking or long-held MVCC
                  snapshots detected.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="adv-a"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-4 items-center"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                  Anti-Pattern Warning
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  Deep savepoints and rollbacks discard expensive MVCC copy-on-write state.
                  Long-running transactions pin old snapshots, preventing Garbage Collection and
                  causing memory bloat.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at the output of FrankenSQLite&apos;s native{" "}
              <FrankenJargon term="timeline-profiling">Timeline Profiler</FrankenJargon>. Because
              the engine controls its own execution down to the{" "}
              <FrankenJargon term="vdbe">VDBE</FrankenJargon> opcode level, it can log the exact
              microsecond a transaction starts, reads, writes, issues a savepoint, and commits.
            </div>
            <p>
              It outputs this data as JSON compatible with Google Chrome&apos;s DevTools performance
              tab, providing full per-operation visibility into transaction behavior.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Toggle between the <strong>Healthy Transaction</strong> and the{" "}
              <strong>Anti-Pattern Detected</strong> tabs.
            </p>
            <p>
              Notice how the anti-pattern transaction takes way longer, but more importantly, look
              at the Engine Advisor JSON output below it. The engine actively analyzes the trace and
              emits warnings like <code>LONG_TXN</code> and <code>ROLLBACK_PRESSURE</code>.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Debugging a slow database typically requires either guesswork or an external APM agent
              that injects overhead and still lacks visibility into the engine&apos;s internal lock
              queues and <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>{" "}
              lifecycle.
            </div>
            <div>
              By building <FrankenJargon term="timeline-profiling">observability</FrankenJargon>{" "}
              into the storage engine itself, developers get zero-configuration performance data and
              proactive advice on patterns that cause{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> version bloat, such as long-held
              snapshots that prevent garbage collection.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
