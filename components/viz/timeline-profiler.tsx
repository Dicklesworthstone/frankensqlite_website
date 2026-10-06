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
  type: "begin" | "read" | "write" | "savepoint" | "rollback" | "pragma" | "commit";
  label: string;
}

/*
 * Example output is abridged from the shape built in
 * crates/fsqlite-core/src/connection.rs (txn_timeline_json_rows,
 * txn_advisor_rows). Timings are illustrative. pid/tid/args on each trace
 * event and the "advisor" thresholds object are omitted for space.
 */

const HEALTHY_JSON = `{
  "active": true,
  "snapshot_age_ms": 9,
  "first_read_ms": 2,
  "first_write_ms": 6,
  "read_ops": 2,
  "write_ops": 1,
  "savepoint_depth": 0,
  "active_rollbacks": 0,
  "traceEvents": [
    { "name": "txn_lifecycle", "ph": "B", "ts": 0 },
    { "name": "first_read",    "ph": "i", "ts": 2000 },
    { "name": "first_write",   "ph": "i", "ts": 6000 },
    { "name": "txn_counters",  "ph": "C", "ts": 9000 }
  ]
}`;

const ANTIPATTERN_JSON = `{
  "active": true,
  "snapshot_age_ms": 6210,
  "first_read_ms": 222,
  "first_write_ms": 2960,
  "read_ops": 1,
  "write_ops": 2,
  "savepoint_depth": 1,
  "active_rollbacks": 1,
  "traceEvents": [
    { "name": "txn_lifecycle", "ph": "B", "ts": 0 },
    { "name": "first_read",    "ph": "i", "ts": 222000 },
    { "name": "first_write",   "ph": "i", "ts": 2960000 },
    { "name": "txn_counters",  "ph": "C", "ts": 6210000 }
  ]
}`;

export default function TimelineProfiler() {
  const [activeTab, setActiveTab] = useState<"healthy" | "antipattern">("healthy");

  const healthyEvents: TimelineEvent[] = [
    { id: "h1", time: 5, type: "begin", label: "BEGIN" },
    { id: "h2", time: 20, type: "read", label: "SELECT (first read)" },
    { id: "h3", time: 35, type: "read", label: "SELECT" },
    { id: "h4", time: 55, type: "write", label: "UPDATE (first write)" },
    { id: "h5", time: 75, type: "pragma", label: "PRAGMA fsqlite_txn_timeline_json" },
    { id: "h6", time: 88, type: "commit", label: "COMMIT" },
  ];

  const antipatternEvents: TimelineEvent[] = [
    { id: "a1", time: 4, type: "begin", label: "BEGIN" },
    { id: "a2", time: 7, type: "read", label: "SELECT (first read)" },
    { id: "a3", time: 40, type: "savepoint", label: "SAVEPOINT a" },
    { id: "a4", time: 44, type: "write", label: "INSERT (first write)" },
    { id: "a5", time: 56, type: "savepoint", label: "SAVEPOINT b" },
    { id: "a6", time: 62, type: "write", label: "UPDATE" },
    { id: "a7", time: 74, type: "rollback", label: "ROLLBACK TO a" },
    { id: "a8", time: 88, type: "pragma", label: "PRAGMA fsqlite_txn_timeline_json" },
    { id: "a9", time: 96, type: "commit", label: "COMMIT" },
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
      case "pragma":
        return "bg-white";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <VizContainer
      title="Transaction Observability"
      description="FrankenSQLite exposes transaction lifecycle data through PRAGMAs. PRAGMA fsqlite_txn_timeline_json returns a JSON snapshot of the connection's current transaction for timeline tooling, and PRAGMA fsqlite_txn_advisor flags patterns such as long-running transactions."
      minHeight={450}
      status="live"
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
          <div className="relative h-20 w-full mb-2">
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

          <div className="text-center text-[9px] font-mono text-slate-500 mb-6">
            BEGIN to COMMIT: {activeTab === "healthy" ? "≈ 11 ms" : "≈ 6.8 s"} (illustrative).
            Hover a dot to see the statement.
          </div>

          {/* JSON Output Snippet */}
          <div className="bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-[10px] text-slate-400 overflow-x-auto">
            <div className="text-teal-500/50 mb-2">
              {"// PRAGMA fsqlite_txn_timeline_json; (run before COMMIT, abridged)"}
            </div>
            <AnimatePresence mode="wait">
              {activeTab === "healthy" ? (
                <motion.pre
                  key="json-h"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {HEALTHY_JSON}
                </motion.pre>
              ) : (
                <motion.pre
                  key="json-a"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {ANTIPATTERN_JSON}
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
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-1">
                  PRAGMA fsqlite_txn_advisor
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  No rows. The transaction is short and under every default threshold: 5,000 ms
                  for <code>long_txn</code>, 256 read operations for <code>large_read_set</code>,
                  savepoint depth 8 for <code>deep_savepoint_stack</code>.
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
              <div className="min-w-0 flex flex-col gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  PRAGMA fsqlite_txn_advisor
                </div>
                <div className="overflow-x-auto rounded border border-amber-500/20 bg-black/40 px-2 py-1.5 font-mono text-[10px] text-amber-200/90 whitespace-nowrap">
                  long_txn | warn | actual 6210 | threshold 5000
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  &ldquo;transaction has been active for 6210ms; consider reducing scope or
                  committing sooner.&rdquo; While it stays open, its snapshot holds back MVCC
                  version cleanup.
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
              The dots on the line are the statements an application ran inside one transaction
              (timings are illustrative). The JSON is what{" "}
              <code>PRAGMA fsqlite_txn_timeline_json</code> returns when you query it on the same
              connection before <code>COMMIT</code>. Its aliases are{" "}
              <code>txn_timeline_json</code> and <code>fsqlite.txn_timeline_json</code>.
            </div>
            <p>
              The engine doesn&apos;t log every statement. It records when the transaction began,
              when it first read and first wrote (in milliseconds), and running counters for
              reads, writes, savepoint depth and rollbacks. The same data is repeated as a{" "}
              <code>traceEvents</code> array of trace-event records (<code>ph</code>,{" "}
              <code>ts</code> in microseconds) for timeline tools.
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
              In the second, the application reads, then leaves the transaction open for seconds
              before writing, nests two savepoints and rolls one back. Its JSON shows a 6.2-second
              snapshot age, and <code>PRAGMA fsqlite_txn_advisor</code> returns a{" "}
              <code>long_txn</code> row with the measured value and the threshold it crossed.
              The advisor can also return <code>large_read_set</code>,{" "}
              <code>deep_savepoint_stack</code> and <code>rollback_pressure</code> rows. The last
              one looks at the connection&apos;s history: once it has completed at least 4
              transactions, it fires when rollbacks (<code>ROLLBACK TO</code> included) reach 50%
              of them.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Long transactions cause trouble in any{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> engine. In FrankenSQLite, an open
              transaction&apos;s <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>{" "}
              holds back the garbage-collection horizon, so older page versions can&apos;t be
              pruned until it ends.
            </div>
            <div>
              Because the counters live in the engine, you can read them with plain SQL from the
              same connection, with no external agent. The{" "}
              <FrankenJargon term="timeline-profiling">advisor</FrankenJargon> thresholds are
              adjustable with <code>PRAGMA fsqlite.txn_advisor_long_txn_ms</code>,{" "}
              <code>fsqlite.txn_advisor_large_read_ops</code>,{" "}
              <code>fsqlite.txn_advisor_savepoint_depth</code> and{" "}
              <code>fsqlite.txn_advisor_rollback_ratio_percent</code>.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
