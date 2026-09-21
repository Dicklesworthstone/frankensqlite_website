"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Database, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { useSimulation } from "@/hooks/use-simulation";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Mode = "normal" | "checkpoint" | "recovery";

interface WalFrame {
  id: number;
  writerId: number;
  pageNum: number;
  committed: boolean;
  /** Whether this frame has been checkpointed */
  flushed: boolean;
  /** Timestamp for animation ordering */
  addedAt: number;
}

interface WriterDef {
  id: number;
  name: string;
  color: string;
  /** Frames per second */
  rate: number;
}

const WRITERS: WriterDef[] = [
  { id: 0, name: "Writer A", color: "#38bdf8", rate: 1.5 },
  { id: 1, name: "Writer B", color: "#a78bfa", rate: 1.0 },
  { id: 2, name: "Writer C", color: "#fb923c", rate: 0.7 },
];

const DB_PAGES = 8;
const MAX_WAL_FRAMES = 20;

/* ------------------------------------------------------------------ */
/*  Checkpoint steps                                                   */
/* ------------------------------------------------------------------ */

const CHECKPOINT_STEPS: Step[] = [
  {
    label: "WAL threshold reached",
    description:
      "The WAL has accumulated enough frames. Time to flush changes back to the main database file.",
  },
  {
    label: "Frames transfer to main DB",
    description:
      "Each committed WAL frame is written back to its corresponding page slot in the main database file.",
  },
  {
    label: "Checkpoint complete",
    description:
      "WAL recycled. All changes are now durable in the main database. The WAL is empty and ready for new writes.",
  },
];

/* ------------------------------------------------------------------ */
/*  Recovery steps                                                     */
/* ------------------------------------------------------------------ */

const RECOVERY_STEPS: Step[] = [
  {
    label: "Normal writes in progress",
    description: "Multiple writers are appending frames to the WAL concurrently.",
  },
  {
    label: "CRASH!",
    description:
      "Power failure mid-write. The process terminates unexpectedly with uncommitted data in the WAL.",
  },
  {
    label: "WAL scan",
    description:
      "On restart, the WAL is scanned. Committed frames (green) have valid checksums. Uncommitted frames (red) are incomplete.",
  },
  {
    label: "Database consistent",
    description:
      "Committed frames are replayed into the main database. Uncommitted frames are discarded. The database is consistent. No data loss.",
  },
];

/* ------------------------------------------------------------------ */
/*  DB Page visual                                                     */
/* ------------------------------------------------------------------ */

function DbPageSlot({
  pageNum,
  flashColor,
  prefersReducedMotion,
}: {
  pageNum: number;
  flashColor?: string;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <motion.div
      className="relative flex items-center justify-center h-10 rounded-lg border text-xs font-mono font-bold"
      animate={{
        borderColor: flashColor ?? "rgba(255,255,255,0.08)",
        backgroundColor: flashColor ? `${flashColor}15` : "rgba(255,255,255,0.02)",
      }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      <span className="text-slate-500">P{pageNum}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  WAL Frame visual                                                   */
/* ------------------------------------------------------------------ */

function WalFrameBlock({
  frame,
  writer,
  showStatus,
  prefersReducedMotion,
}: {
  frame: WalFrame;
  writer: WriterDef;
  showStatus?: "committed" | "uncommitted";
  prefersReducedMotion: boolean | null;
}) {
  const borderColor =
    showStatus === "committed"
      ? "#22c55e"
      : showStatus === "uncommitted"
        ? "#ef4444"
        : frame.flushed
          ? "rgba(255,255,255,0.05)"
          : writer.color;

  const bgColor =
    showStatus === "committed"
      ? "rgba(34,197,94,0.1)"
      : showStatus === "uncommitted"
        ? "rgba(239,68,68,0.1)"
        : frame.flushed
          ? "rgba(255,255,255,0.01)"
          : `${writer.color}10`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, x: 20 }}
      animate={{
        opacity: frame.flushed ? 0.3 : 1,
        scale: 1,
        x: 0,
        borderColor,
        backgroundColor: bgColor,
      }}
      exit={{ opacity: 0, scale: 0.8, x: -20 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md border text-[10px] font-mono"
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: writer.color }}
      />
      <span className="text-slate-400">P{frame.pageNum}</span>
      {showStatus && (
        <span
          className={`ml-auto text-[9px] font-bold ${
            showStatus === "committed" ? "text-green-400" : "text-red-400"
          }`}
        >
          {showStatus === "committed" ? "OK" : "LOST"}
        </span>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Normal mode content                                                */
/* ------------------------------------------------------------------ */

function NormalMode() {
  const prefersReducedMotion = useReducedMotion();
  const [frames, setFrames] = useState<WalFrame[]>([]);
  const [tps, setTps] = useState(0);
  const nextIdRef = useRef(0);
  const accumulatorRef = useRef<number[]>([0, 0, 0]);
  const tpsWindowRef = useRef<number[]>([]);

  const onTick = useCallback((deltaMs: number) => {
    const deltaSec = deltaMs / 1000;

    const newFrames: WalFrame[] = [];
    WRITERS.forEach((writer, idx) => {
      accumulatorRef.current[idx] += deltaSec * writer.rate;
      while (accumulatorRef.current[idx] >= 1) {
        accumulatorRef.current[idx] -= 1;
        const id = nextIdRef.current++;
        newFrames.push({
          id,
          writerId: writer.id,
          pageNum: Math.floor(Math.random() * DB_PAGES),
          committed: true,
          flushed: false,
          addedAt: Date.now(),
        });
      }
    });

    if (newFrames.length > 0) {
      tpsWindowRef.current.push(Date.now());

      setFrames((prev) => {
        const combined = [...prev, ...newFrames];
        // Keep only latest MAX_WAL_FRAMES
        return combined.slice(-MAX_WAL_FRAMES);
      });
    }

    // Update TPS every ~500ms
    const now = Date.now();
    tpsWindowRef.current = tpsWindowRef.current.filter((t) => now - t < 2000);
    setTps(Math.round(tpsWindowRef.current.length / 2));
  }, []);

  const sim = useSimulation({ onTick, startPaused: false, tickRate: 30 });

  const handleReset = useCallback(() => {
    setFrames([]);
    nextIdRef.current = 0;
    accumulatorRef.current = [0, 0, 0];
    tpsWindowRef.current = [];
    setTps(0);
    sim.reset();
  }, [sim]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={sim.toggle}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
          aria-label={sim.isRunning ? "Pause" : "Play"}
        >
          {sim.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {sim.isRunning ? "Pause" : "Play"}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
          aria-label="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <div className="ml-auto flex items-center gap-4 text-[10px] font-mono">
          <span className="text-slate-500">
            TPS: <span className="text-teal-400 font-bold">{tps}</span>
          </span>
          <span className="text-slate-500">
            WAL:{" "}
            <span className="text-teal-400 font-bold">
              {frames.filter((f) => !f.flushed).length}
            </span>{" "}
            frames
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
        {/* DB file */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Main DB File
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: DB_PAGES }, (_, i) => {
              // Find most recent frame for this page
              const latestFrame = [...frames].reverse().find((f) => f.pageNum === i && !f.flushed);
              const writer = latestFrame
                ? WRITERS.find((w) => w.id === latestFrame.writerId)
                : undefined;
              return (
                <DbPageSlot
                  key={i}
                  pageNum={i}
                  flashColor={writer?.color}
                  prefersReducedMotion={prefersReducedMotion}
                />
              );
            })}
          </div>
        </div>

        {/* WAL */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-500">
              Write-Ahead Log
            </span>
            <div className="ml-auto flex items-center gap-3">
              {WRITERS.map((w) => (
                <span
                  key={w.id}
                  className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
                  {w.name}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {frames
                .filter((f) => !f.flushed)
                .map((frame) => {
                  const writer = WRITERS.find((w) => w.id === frame.writerId)!;
                  return (
                    <WalFrameBlock
                      key={frame.id}
                      frame={frame}
                      writer={writer}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  );
                })}
            </AnimatePresence>
            {frames.filter((f) => !f.flushed).length === 0 && (
              <div className="text-xs text-slate-600 text-center py-8 font-mono">
                WAL empty — press Play
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkpoint mode content                                            */
/* ------------------------------------------------------------------ */

function CheckpointMode() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const onStepChange = useCallback((s: number) => setStep(s), []);

  // Pre-built frames for the checkpoint demo
  const demoFrames = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        writerId: i % 3,
        pageNum: [0, 3, 5, 1, 7, 4][i],
        committed: true,
        flushed: step >= 2,
        addedAt: 0,
      })),
    [step],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
        {/* DB file */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Main DB File
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: DB_PAGES }, (_, i) => {
              const hasFrame = demoFrames.find((f) => f.pageNum === i);
              const writer = hasFrame ? WRITERS[hasFrame.writerId] : undefined;
              return (
                <DbPageSlot
                  key={i}
                  pageNum={i}
                  flashColor={step >= 1 && hasFrame ? writer?.color : undefined}
                  prefersReducedMotion={prefersReducedMotion}
                />
              );
            })}
          </div>
        </div>

        {/* WAL */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-500">
              Write-Ahead Log
            </span>
          </div>
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {step < 2 &&
                demoFrames.map((frame) => {
                  const writer = WRITERS[frame.writerId];
                  return (
                    <WalFrameBlock
                      key={frame.id}
                      frame={frame}
                      writer={writer}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  );
                })}
            </AnimatePresence>
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-emerald-400/60 text-center py-8 font-mono"
              >
                WAL recycled — checkpoint complete
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <Stepper steps={CHECKPOINT_STEPS} currentStep={step} onStepChange={onStepChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recovery mode content                                              */
/* ------------------------------------------------------------------ */

function RecoveryMode() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const onStepChange = useCallback((s: number) => setStep(s), []);

  // Demo frames — last 2 are uncommitted
  const frames = useMemo(
    () => [
      { id: 0, writerId: 0, pageNum: 2, committed: true, flushed: false, addedAt: 0 },
      { id: 1, writerId: 1, pageNum: 5, committed: true, flushed: false, addedAt: 0 },
      { id: 2, writerId: 0, pageNum: 0, committed: true, flushed: false, addedAt: 0 },
      { id: 3, writerId: 2, pageNum: 7, committed: true, flushed: false, addedAt: 0 },
      { id: 4, writerId: 1, pageNum: 3, committed: false, flushed: false, addedAt: 0 },
      { id: 5, writerId: 2, pageNum: 6, committed: false, flushed: false, addedAt: 0 },
    ],
    [],
  );

  const showCrash = step >= 1;
  const showScan = step >= 2;
  const showRecovered = step >= 3;

  const visibleFrames = showRecovered ? frames.filter((f) => f.committed) : frames;

  return (
    <div className="space-y-4">
      {/* Crash banner */}
      <AnimatePresence>
        {showCrash && step < 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-center gap-3"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-xs font-bold text-red-300">CRASH — power failure mid-write</span>
          </motion.div>
        )}
        {showRecovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-center gap-3"
          >
            <Database className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-bold text-emerald-300">
              Database consistent — 4 frames replayed, 2 discarded
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WAL frames */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-500">
            WAL Recovery Scan
          </span>
        </div>
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {visibleFrames.map((frame) => {
              const writer = WRITERS[frame.writerId];
              const status: "committed" | "uncommitted" | undefined = showScan
                ? frame.committed
                  ? "committed"
                  : "uncommitted"
                : undefined;
              return (
                <WalFrameBlock
                  key={frame.id}
                  frame={frame}
                  writer={writer}
                  showStatus={status}
                  prefersReducedMotion={prefersReducedMotion}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <Stepper steps={RECOVERY_STEPS} currentStep={step} onStepChange={onStepChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const MODES: { id: Mode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "checkpoint", label: "Checkpoint" },
  { id: "recovery", label: "Crash Recovery" },
];

export default function WalLanes() {
  const [mode, setMode] = useState<Mode>("normal");

  return (
    <VizContainer
      title="WAL Lane Visualizer"
      description="See how the Write-Ahead Log works, with per-writer lanes, checkpoints, and crash recovery."
      minHeight={460}
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5 w-fit">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                mode === m.id
                  ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                  : "text-slate-500 hover:text-white border border-transparent"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "normal" && <NormalMode />}
            {mode === "checkpoint" && <CheckpointMode />}
            {mode === "recovery" && <RecoveryMode />}
          </motion.div>
        </AnimatePresence>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at the <FrankenJargon term="wal">Write-Ahead Log (WAL)</FrankenJargon>
              . When transactions commit, they don&apos;t write directly to the main database file
              (which would be slow and block readers). Instead, they append their changes
              sequentially to the WAL.
            </div>
            <p>
              Use the tabs to switch between Normal operations, Checkpointing, and Crash Recovery.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              In <strong>Normal</strong> mode, click Play to watch multiple writers append to the
              log simultaneously. Notice how each writer gets its own color-coded
              &ldquo;lane.&rdquo; No blocking!
            </p>
            <p>
              In <strong>Checkpoint</strong> mode, use the stepper to see how a background thread
              safely copies older frames from the <FrankenJargon term="wal">WAL</FrankenJargon> back
              into the main database file without interrupting active queries.
            </p>
            <p>
              In <strong>Crash Recovery</strong> mode, step through to see what happens when the
              power dies. The engine simply scans the WAL, verifies the checksums, and discards any
              frames that weren&apos;t fully committed.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              In standard SQLite, the <FrankenJargon term="wal">WAL</FrankenJargon> serializes all
              writes through a single thread, limiting throughput to one writer at a time.
              FrankenSQLite&apos;s <FrankenJargon term="mvcc">MVCC</FrankenJargon> architecture
              allows multiple writers to stream into the WAL concurrently.
            </p>
            <p>
              By strictly enforcing an append-only design, this approach achieves two properties:
              sequential disk I/O that saturates modern NVMe bandwidth, and crash-safe durability
              where a sudden power loss never corrupts the main database file. The{" "}
              <FrankenJargon term="wal-index">WAL index</FrankenJargon> in shared memory enables
              checkpoint operations to run in the background without blocking readers.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
