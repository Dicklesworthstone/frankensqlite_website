"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Combine, Cpu, Database, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// Model of the live commit path: each connection (one per OS thread) does its
// own statement execution and private page writes; those overlap. To commit,
// the connection itself takes the per-database commit lock and, while holding
// it, validates (FCW, then SSI), writes to the WAL, and publishes. One
// connection is inside that section at a time. There is no coordinator thread.

type Stage = "work" | "waiting" | "validating" | "wal" | "publish";

interface TxnTask {
  id: string;
  workerId: number;
  progress: number;
  state: Stage;
  color: string;
  retried: boolean;
}

const WORKERS = [0, 1, 2, 3];
const COLORS = ["bg-blue-500", "bg-teal-500", "bg-amber-500", "bg-purple-500"];
/** Illustrative chance that validation finds a conflict (same-page drift or SSI pivot). */
const CONFLICT_CHANCE = 0.15;

const COMMIT_STAGES: { stage: Stage; label: string }[] = [
  { stage: "validating", label: "Validate (FCW + SSI)" },
  { stage: "wal", label: "WAL write" },
  { stage: "publish", label: "Publish" },
];

function inCommit(s: Stage) {
  return s === "validating" || s === "wal" || s === "publish";
}

export default function WriteCoordinator() {
  const [tasks, setTasks] = useState<TxnTask[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [walBlocks, setWalBlocks] = useState<{ id: number; color: string }[]>([]);
  const [retries, setRetries] = useState(0);
  const tasksRef = useRef<TxnTask[]>([]);
  const txnCounterRef = useRef(1);
  const walIdRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSimulating) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    const loop = () => {
      const prev = tasksRef.current;
      let commitBusy = prev.some((t) => inCommit(t.state));
      const committedColors: string[] = [];
      let newRetries = 0;

      const next: TxnTask[] = [];
      for (const t of prev) {
        const u = { ...t };
        if (u.state === "work") {
          u.progress += 0.5 + Math.random() * 0.5; // page work, overlapping across connections
          if (u.progress >= 100) {
            u.state = "waiting";
            u.progress = 0;
          }
        } else if (u.state === "waiting") {
          if (!commitBusy) {
            u.state = "validating";
            u.progress = 0;
            commitBusy = true; // one connection in the commit section at a time
          }
        } else if (u.state === "validating") {
          u.progress += 10;
          if (u.progress >= 100) {
            if (Math.random() < CONFLICT_CHANCE) {
              // SQLITE_BUSY_SNAPSHOT: release the section, redo the transaction.
              u.state = "work";
              u.progress = 0;
              u.retried = true;
              newRetries++;
            } else {
              u.state = "wal";
              u.progress = 0;
            }
          }
        } else if (u.state === "wal") {
          u.progress += 5;
          if (u.progress >= 100) {
            u.state = "publish";
            u.progress = 0;
          }
        } else if (u.state === "publish") {
          u.progress += 12;
          if (u.progress >= 100) {
            committedColors.push(u.color);
            continue; // committed; the connection is free for its next transaction
          }
        }
        next.push(u);
      }

      // Idle connections occasionally start a new transaction.
      for (const workerId of WORKERS) {
        if (!next.some((t) => t.workerId === workerId) && Math.random() < 0.02) {
          next.push({
            id: `T${txnCounterRef.current++}`,
            workerId,
            progress: 0,
            state: "work",
            color: COLORS[workerId % COLORS.length],
            retried: false,
          });
        }
      }

      tasksRef.current = next;
      setTasks(next);
      if (committedColors.length > 0) {
        setWalBlocks((wb) =>
          [
            ...wb,
            ...committedColors.map((c) => ({
              id: walIdRef.current++,
              color: c,
            })),
          ].slice(-16),
        );
      }
      if (newRetries > 0) setRetries((r) => r + newRetries);

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isSimulating]);

  const waiting = tasks.filter((t) => t.state === "waiting");

  return (
    <VizContainer
      title="Write Coordination"
      description="A write has two phases. Statement execution and page changes run on each connection's own thread and overlap with other connections. Commit is a short critical section that one connection enters at a time: validation, the WAL write, and publishing the new page versions. In the live runtime the committing connection does this itself; there is no separate coordinator thread."
      minHeight={450}
      status="live"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 relative justify-between overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-3 z-10 border-b border-white/10 pb-4">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isSimulating ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-teal-500 text-black border border-teal-400 hover:bg-teal-400"}`}
          >
            {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isSimulating ? "Pause Simulation" : "Run Pipeline"}
          </button>
          <span className="text-[10px] font-mono text-slate-500">
            Retries (SQLITE_BUSY_SNAPSHOT):{" "}
            <span className="font-bold text-amber-400 tabular-nums">{retries}</span>
            <span className="text-slate-600"> · conflict rate is illustrative</span>
          </span>
        </div>

        {/* Pipeline Viz */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 relative z-10">
          {/* Phase 1: Parallel */}
          <div className="flex-1 flex flex-col gap-2 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
              <Cpu className="w-3 h-3" /> 1. Page work (each connection&apos;s own thread)
            </div>

            <div className="flex-1 border border-white/5 bg-white/[0.02] rounded-xl p-3 flex flex-col justify-around gap-2">
              {WORKERS.map((workerIdx) => {
                const task = tasks.find((t) => t.workerId === workerIdx);
                return (
                  <div
                    key={workerIdx}
                    className="h-8 rounded bg-black/50 border border-white/10 relative overflow-hidden flex items-center px-2"
                  >
                    <span className="text-[9px] text-slate-600 font-mono z-10 absolute left-2">
                      Conn {workerIdx}
                    </span>
                    {task && task.state === "work" && (
                      <motion.div
                        key={task.id}
                        className={`absolute top-1 bottom-1 left-16 rounded ${task.color} flex items-center justify-center text-[8px] font-bold text-white shadow`}
                        style={{ width: `calc((100% - 4.5rem) * ${task.progress / 100})` }}
                      >
                        {task.id}
                        {task.retried ? " ↻" : ""}
                      </motion.div>
                    )}
                    {task && task.state === "waiting" && (
                      <span className="absolute left-16 text-[9px] font-mono text-slate-400">
                        {task.id} waiting for commit lock
                      </span>
                    )}
                    {task && inCommit(task.state) && (
                      <span className="absolute left-16 text-[9px] font-mono text-teal-400">
                        {task.id} committing on this thread
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hand-off */}
          <div className="flex items-center justify-center px-2">
            <div className="flex flex-col items-center gap-1 text-slate-500 opacity-50">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
          </div>

          {/* Phase 2: Serialized commit section */}
          <div className="w-full md:w-64 flex flex-col gap-2 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-teal-500 flex items-center gap-2 mb-2">
              <Combine className="w-3 h-3" /> 2. Commit section (one at a time)
            </div>

            <div className="flex-1 border border-teal-500/20 bg-teal-500/5 rounded-xl p-3 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />

              {/* Waiting for the lock */}
              <div className="flex gap-1 h-6">
                <span className="text-[9px] text-slate-500 uppercase flex items-center mr-2">
                  Waiting
                </span>
                <AnimatePresence>
                  {waiting.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={`w-6 h-full rounded ${t.color} flex items-center justify-center text-[8px] text-white font-bold opacity-60`}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Active stages */}
              <div className="flex-1 border border-white/10 bg-black/40 rounded-lg p-2 flex flex-col justify-center gap-2 relative">
                {COMMIT_STAGES.map(({ stage, label }) => {
                  const active = tasks.find((t) => t.state === stage);
                  return (
                    <div
                      key={stage}
                      className="h-8 rounded bg-white/5 border border-white/5 flex items-center px-2 relative overflow-hidden"
                    >
                      <span className="text-[9px] text-slate-400 font-mono z-10 absolute left-2 uppercase tracking-wider">
                        {label}
                      </span>
                      {active && (
                        <div
                          className={`absolute top-0 bottom-0 left-0 ${active.color} flex items-center justify-end pr-2 text-[8px] font-bold text-white transition-all`}
                          style={{ width: `${Math.min(active.progress, 100)}%` }}
                        >
                          {active.id}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Disk Output */}
        <div className="h-12 border border-white/10 bg-black/60 rounded-xl flex items-center px-4 gap-2 relative z-10 overflow-hidden">
          <Database className="w-4 h-4 text-slate-500" />
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest border-r border-white/10 pr-3 mr-1">
            WAL file
          </span>
          <div className="flex gap-1 flex-1 overflow-hidden justify-end">
            <AnimatePresence>
              {walBlocks.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`w-4 h-full rounded-sm ${block.color}`}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              The commit path of the live runtime. Each connection (one per OS thread) runs its
              own statements and builds private versions of the{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> pages it changes, and that work
              overlaps across connections.
            </div>
            <p>
              To commit, a connection takes a per-database commit lock and, while holding it,
              validates (first-committer-wins, then SSI), writes its pages to the WAL, and
              publishes the new versions so later snapshots can see them. The committing connection
              does this on its own thread. The engine does have a{" "}
              <FrankenJargon term="write-coordinator">WriteCoordinator</FrankenJargon> service, but
              in the live runtime it is lifecycle scaffolding only; a queue-based coordinator with
              batching is planned work.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Run Pipeline</strong>. On the left, four connections do their page work
              at the same time.
            </p>
            <div>
              When one finishes, it waits for the commit lock, then moves through{" "}
              <FrankenJargon term="ssi">validation</FrankenJargon>, the{" "}
              <FrankenJargon term="wal">WAL</FrankenJargon> write, and publish, one connection at a
              time.
            </div>
            <p>
              Some commits fail validation (a same-page conflict or an SSI pivot). That connection
              gets <code>SQLITE_BUSY_SNAPSHOT</code> and starts its transaction over, marked ↻.
              The conflict rate in this demo is made up.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Keeping the commit section short is what lets everything before it overlap. Holding
              one lock across validate, write, and publish also closes a real race: without it,
              two connections could both claim the same newly allocated page.
            </p>
            <p>
              The cost is that commits to one database are serialized, so commit-heavy workloads
              are limited by how fast that section runs, including any WAL sync your{" "}
              <code>PRAGMA synchronous</code> setting requires. The native-mode design moves bulk
              writes out of the section and leaves a single sequencer to order small commit
              records; that design is not the live path.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
