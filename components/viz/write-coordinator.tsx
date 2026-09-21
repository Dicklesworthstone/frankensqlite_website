"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Combine, Cpu, Database, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface TxnTask {
  id: string;
  workerId: number;
  progress: number;
  state: "btree" | "waiting" | "validating" | "wal" | "done";
  color: string;
}

export default function WriteCoordinator() {
  const [tasks, setTasks] = useState<TxnTask[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [walBlocks, setWalBlocks] = useState<{ id: number; color: string }[]>([]);
  const txnCounterRef = useRef(1);
  const walIdRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const colors = useMemo(
    () => ["bg-blue-500", "bg-teal-500", "bg-amber-500", "bg-purple-500", "bg-pink-500"],
    [],
  );

  const spawnTxn = useCallback(() => {
    const id = `T${txnCounterRef.current++}`;
    const workerId = Math.floor(Math.random() * 4); // 4 parallel workers
    const color = colors[workerId % colors.length];

    setTasks((prev) => [
      ...prev,
      {
        id,
        workerId,
        progress: 0,
        state: "btree",
        color,
      },
    ]);
  }, [colors]);

  useEffect(() => {
    if (!isSimulating) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    let lastSpawn = Date.now();

    const loop = () => {
      const now = Date.now();

      // Spawn new tasks occasionally
      if (now - lastSpawn > 800) {
        if (Math.random() > 0.3) spawnTxn();
        lastSpawn = now;
      }

      setTasks((prev) => {
        let coordinatorBusy = prev.some((t) => t.state === "validating" || t.state === "wal");
        const completedColors: string[] = [];

        const next = prev
          .map((t) => {
            const updated = { ...t };
            if (updated.state === "btree") {
              updated.progress += 0.5 + Math.random() * 0.5; // Slow parallel work
              if (updated.progress >= 100) {
                updated.state = "waiting";
              }
            } else if (updated.state === "waiting") {
              // Enter coordinator if free
              if (!coordinatorBusy) {
                updated.state = "validating";
                updated.progress = 0;
                coordinatorBusy = true; // Only one can enter
              }
            } else if (updated.state === "validating") {
              updated.progress += 10; // Extremely fast validation
              if (updated.progress >= 100) {
                updated.state = "wal";
                updated.progress = 0;
              }
            } else if (updated.state === "wal") {
              updated.progress += 5; // Fast sequential I/O
              if (updated.progress >= 100) {
                updated.state = "done";
                completedColors.push(updated.color);
              }
            }
            return updated;
          })
          .filter((t) => t.state !== "done");

        if (completedColors.length > 0) {
          // Schedule WAL block update outside of setTasks updater
          queueMicrotask(() => {
            setWalBlocks((wb) => {
              const newBlocks = completedColors.map((c) => ({
                id: walIdRef.current++,
                color: c,
              }));
              return [...wb, ...newBlocks].slice(-16);
            });
          });
        }

        return next;
      });

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isSimulating, spawnTxn]);

  return (
    <VizContainer
      title="Single-Threaded Write Coordinator"
      description="Database writes have two phases. B-tree modifications are slow and happen in parallel across threads. Commit validation and WAL appending are fast and happen sequentially in a single coordinator thread. This architecture avoids deadlocks and eliminates two-phase commit overhead."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 relative justify-between overflow-hidden">
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isSimulating ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-teal-500 text-black border border-teal-400 hover:bg-teal-400"}`}
          >
            {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isSimulating ? "Pause Simulation" : "Run Pipeline"}
          </button>
        </div>

        {/* Pipeline Viz */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 relative z-10">
          {/* Phase 1: Parallel */}
          <div className="flex-1 flex flex-col gap-2 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-2">
              <Cpu className="w-3 h-3" /> 1. Parallel B-Tree Mod (Slow)
            </div>

            <div className="flex-1 border border-white/5 bg-white/[0.02] rounded-xl p-3 flex flex-col justify-around gap-2">
              {[0, 1, 2, 3].map((workerIdx) => {
                const workerTasks = tasks.filter(
                  (t) => t.workerId === workerIdx && t.state === "btree",
                );
                return (
                  <div
                    key={workerIdx}
                    className="h-8 rounded bg-black/50 border border-white/10 relative overflow-hidden flex items-center px-2"
                  >
                    <span className="text-[9px] text-slate-600 font-mono z-10 absolute left-2">
                      Thread {workerIdx}
                    </span>
                    {workerTasks.map((t) => (
                      <motion.div
                        key={t.id}
                        className={`absolute top-1 bottom-1 left-16 rounded ${t.color} flex items-center justify-center text-[8px] font-bold text-white shadow`}
                        style={{ width: `${t.progress}%` }}
                      >
                        {t.id}
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MPMC Channel */}
          <div className="flex items-center justify-center px-2">
            <div className="flex flex-col items-center gap-1 text-slate-500 opacity-50">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
          </div>

          {/* Phase 2: Sequential Coordinator */}
          <div className="w-full md:w-64 flex flex-col gap-2 relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-teal-500 flex items-center gap-2 mb-2">
              <Combine className="w-3 h-3" /> 2. Coordinator (Fast)
            </div>

            <div className="flex-1 border border-teal-500/20 bg-teal-500/5 rounded-xl p-3 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />

              {/* Queue */}
              <div className="flex gap-1 h-6">
                <span className="text-[9px] text-slate-500 uppercase flex items-center mr-2">
                  Queue
                </span>
                <AnimatePresence>
                  {tasks
                    .filter((t) => t.state === "waiting")
                    .map((t) => (
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

              {/* Active Slot */}
              <div className="flex-1 border border-white/10 bg-black/40 rounded-lg p-2 flex flex-col justify-center gap-2 relative">
                {["validating", "wal"].map((stage) => {
                  const active = tasks.find((t) => t.state === stage);
                  return (
                    <div
                      key={stage}
                      className="h-8 rounded bg-white/5 border border-white/5 flex items-center px-2 relative overflow-hidden"
                    >
                      <span className="text-[9px] text-slate-400 font-mono z-10 absolute left-2 uppercase tracking-wider">
                        {stage === "wal" ? "WAL Append" : "Validation"}
                      </span>
                      {active && (
                        <div
                          className={`absolute top-0 bottom-0 left-0 ${active.color} flex items-center justify-end pr-2 text-[8px] font-bold text-white transition-all`}
                          style={{ width: `${active.progress}%` }}
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
            WAL Disk
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
              You are watching the transaction commit pipeline. On the left are four concurrent
              worker threads. On the right is the{" "}
              <FrankenJargon term="write-coordinator">
                Single-Threaded Write Coordinator
              </FrankenJargon>
              .
            </div>
            <p>
              In standard multi-threaded databases, every thread contends on a shared Mutex to
              safely write data to disk, causing significant lock contention under load.
            </p>
          </>
        }
        howToUse={
          <>
            <div>
              Click <strong>Run Pipeline</strong>. Watch how the heavy lifting, modifying{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> pages in memory, happens completely
              in parallel on the left.
            </div>
            <p>
              When a thread finishes its work, it does not try to write to disk. Instead, it sends a
              small &ldquo;commit request&rdquo; across an MPMC (Multi-Producer, Multi-Consumer)
              channel into the Coordinator&apos;s queue on the right.
            </p>
            <div>
              Notice how the <FrankenJargon term="write-coordinator">Coordinator</FrankenJargon>{" "}
              processes the queue rapidly, performing{" "}
              <FrankenJargon term="ssi">SSI Validation</FrankenJargon> and{" "}
              <FrankenJargon term="wal">WAL Appending</FrankenJargon> sequentially, one commit after
              another.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              This design separates the slow, CPU-intensive work (
              <FrankenJargon term="btree">B-tree</FrankenJargon> modification) from the fast,
              I/O-bound work (<FrankenJargon term="wal">WAL</FrankenJargon> append). The slow phase
              runs in parallel across all available cores; the fast phase runs sequentially in a
              single thread.
            </p>
            <p>
              This eliminates the need for two-phase commit protocols and complex locking
              hierarchies. Because a single thread owns the{" "}
              <FrankenJargon term="wal">WAL</FrankenJargon> append path, writes are strictly
              sequential, which maximizes NVMe throughput and ensures that{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> commit ordering is trivially correct.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
