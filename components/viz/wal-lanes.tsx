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
  /** Whether this frame is at or before the last commit frame (survives recovery) */
  committed: boolean;
  /** Last frame of a transaction: its header records the database size, marking the commit */
  commitFrame: boolean;
  /** Whether this frame has been checkpointed */
  flushed: boolean;
  /** Timestamp for animation ordering */
  addedAt: number;
}

interface WriterDef {
  id: number;
  name: string;
  color: string;
  /** Commits per second (illustrative) */
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
    label: "WAL passes the checkpoint threshold",
    description:
      "The WAL has grown past the auto-checkpoint threshold (see PRAGMA wal_autocheckpoint), or the application ran PRAGMA wal_checkpoint.",
  },
  {
    label: "Frames copied to the database file",
    description:
      "For each page, the newest committed frame is written back to that page's slot in the main database file. Frames that an open reader's snapshot still needs are left until that reader finishes.",
  },
  {
    label: "Checkpoint complete",
    description:
      "The database file now holds the latest committed pages. The changes were already durable in the WAL; once no reader needs the old frames, the WAL can be reset and reused from the start.",
  },
];

/* ------------------------------------------------------------------ */
/*  Recovery steps                                                     */
/* ------------------------------------------------------------------ */

const RECOVERY_STEPS: Step[] = [
  {
    label: "Commits in progress",
    description:
      "Transactions append their frames to the end of the WAL, one transaction at a time. The last frame of each transaction is a commit frame: its header records the database size, which marks the commit boundary.",
  },
  {
    label: "CRASH!",
    description:
      "Power fails while the fourth transaction is still writing its frames. Its commit frame never reaches the disk.",
  },
  {
    label: "WAL scan",
    description:
      "On restart, the engine reads the WAL from the start, checking each frame's salt and running checksum, and finds the last valid commit frame. Frames after it (red) belong to a transaction that never finished.",
  },
  {
    label: "Database consistent",
    description:
      "Frames up to that commit frame are kept and the WAL index is rebuilt from them; a later checkpoint copies them into the database file. Frames after it are discarded. Transactions whose commit frame reached disk survive; the interrupted one is gone, as if it never started.",
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
      <span className="text-slate-600">#{frame.id + 1}</span>
      <span className="text-slate-400">P{frame.pageNum}</span>
      {frame.commitFrame && (
        <span className="rounded border border-teal-500/30 px-1 text-[8px] font-bold uppercase tracking-wider text-teal-400">
          commit
        </span>
      )}
      {showStatus && (
        <span
          className={`ml-auto text-[9px] font-bold ${
            showStatus === "committed" ? "text-green-400" : "text-red-400"
          }`}
        >
          {showStatus === "committed" ? "kept" : "discarded"}
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
  const [progress, setProgress] = useState<number[]>([0, 0, 0]);
  const nextIdRef = useRef(0);
  const accumulatorRef = useRef<number[]>([0, 0, 0]);
  const tpsWindowRef = useRef<number[]>([]);

  const onTick = useCallback((deltaMs: number) => {
    const deltaSec = deltaMs / 1000;

    // Page work overlaps across writers. When a writer's transaction is ready,
    // its commit appends all of its frames to the single WAL as one contiguous
    // group, ending with a commit frame. Commits are applied one after another.
    const newFrames: WalFrame[] = [];
    let commits = 0;
    WRITERS.forEach((writer, idx) => {
      accumulatorRef.current[idx] += deltaSec * writer.rate;
      while (accumulatorRef.current[idx] >= 1) {
        accumulatorRef.current[idx] -= 1;
        commits++;
        const frameCount = 1 + Math.floor(Math.random() * 2);
        const first = Math.floor(Math.random() * DB_PAGES);
        for (let f = 0; f < frameCount; f++) {
          newFrames.push({
            id: nextIdRef.current++,
            writerId: writer.id,
            pageNum: (first + f * 3) % DB_PAGES,
            committed: true,
            commitFrame: f === frameCount - 1,
            flushed: false,
            addedAt: Date.now(),
          });
        }
      }
    });
    setProgress([...accumulatorRef.current]);

    if (newFrames.length > 0) {
      const now = Date.now();
      for (let c = 0; c < commits; c++) tpsWindowRef.current.push(now);

      setFrames((prev) => {
        const combined = [...prev, ...newFrames];
        // Keep only latest MAX_WAL_FRAMES
        return combined.slice(-MAX_WAL_FRAMES);
      });
    }

    // Commits per second over a 2 s window
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
    setProgress([0, 0, 0]);
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
            Commits/s (sim): <span className="text-teal-400 font-bold">{tps}</span>
          </span>
          <span className="text-slate-500">
            WAL:{" "}
            <span className="text-teal-400 font-bold">
              {frames.filter((f) => !f.flushed).length}
            </span>{" "}
            frames shown
          </span>
        </div>
      </div>

      {/* Writers' private page work (overlaps) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {WRITERS.map((w, idx) => (
          <div key={w.id} className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 mb-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
              {w.name}: page work
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(progress[idx] ?? 0, 1) * 100}%`,
                  backgroundColor: w.color,
                }}
              />
            </div>
          </div>
        ))}
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
          <p className="mb-2 text-[9px] font-mono text-slate-600">
            Unchanged until a checkpoint. Lit pages have a newer copy in the WAL.
          </p>
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
              Write-Ahead Log (one file, commit order)
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
                WAL empty. Press Play.
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
        writerId: [0, 0, 1, 2, 2, 0][i],
        pageNum: [0, 3, 5, 1, 7, 4][i],
        committed: true,
        commitFrame: [false, true, true, false, true, true][i],
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
                Checkpoint complete. The WAL can be reused once no reader needs it.
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

  // Demo frames: three complete transactions, then a fourth (Writer B) whose
  // commit frame never reached disk. Its frames come after the last commit frame.
  const frames = useMemo<WalFrame[]>(
    () => [
      {
        id: 0,
        writerId: 0,
        pageNum: 2,
        committed: true,
        commitFrame: false,
        flushed: false,
        addedAt: 0,
      },
      {
        id: 1,
        writerId: 0,
        pageNum: 5,
        committed: true,
        commitFrame: true,
        flushed: false,
        addedAt: 0,
      },
      {
        id: 2,
        writerId: 2,
        pageNum: 0,
        committed: true,
        commitFrame: true,
        flushed: false,
        addedAt: 0,
      },
      {
        id: 3,
        writerId: 0,
        pageNum: 7,
        committed: true,
        commitFrame: true,
        flushed: false,
        addedAt: 0,
      },
      {
        id: 4,
        writerId: 1,
        pageNum: 3,
        committed: false,
        commitFrame: false,
        flushed: false,
        addedAt: 0,
      },
      {
        id: 5,
        writerId: 1,
        pageNum: 6,
        committed: false,
        commitFrame: false,
        flushed: false,
        addedAt: 0,
      },
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
            <span className="text-xs font-bold text-red-300">
              CRASH: power failure before the fourth transaction&apos;s commit frame
            </span>
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
              Consistent: 3 transactions (4 frames) kept, 2 frames after the last commit discarded
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
      title="WAL Visualizer"
      description="See how the write-ahead log works: commits append frames to one log, checkpoints copy them back into the database file, and crash recovery keeps only complete transactions."
      minHeight={460}
      status="live"
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
              The <FrankenJargon term="wal">write-ahead log (WAL)</FrankenJargon>. Committing
              transactions don&apos;t change the main database file directly. They append the new
              contents of each page they changed, one frame per page, to the end of the WAL.
              FrankenSQLite uses SQLite&apos;s own WAL format, so stock SQLite can read what it
              writes.
            </div>
            <p>
              Use the tabs to switch between normal operation, checkpointing, and crash recovery.
              Rates and frame counts here are illustrative.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              In <strong>Normal</strong> mode, click Play. The writers do their page work at the
              same time (the bars at the top), but frames reach the WAL one transaction at a time,
              during each writer&apos;s commit step, and every transaction ends with a commit
              frame.
            </p>
            <p>
              In <strong>Checkpoint</strong> mode, step through how committed frames are copied
              from the <FrankenJargon term="wal">WAL</FrankenJargon> back into the main database
              file, skipping any that an open reader still needs.
            </p>
            <p>
              In <strong>Crash Recovery</strong> mode, see what a restart does after a power loss:
              it checks frame checksums, keeps everything up to the last valid commit frame, and
              discards the rest.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Appending to a log is what makes commits atomic and crash-safe. The main file only
              changes during a checkpoint, from frames that are already committed, so a crash in
              the middle of a commit cannot leave it half-updated. Readers find the newest
              committed copy of a page through an index instead of scanning the log. FrankenSQLite
              keeps its own in-process page map for this and, on Unix, also maintains
              SQLite&apos;s shared <FrankenJargon term="wal-index">WAL index</FrankenJargon> (the{" "}
              <code>-shm</code> file) so stock SQLite processes can follow along.
            </p>
            <p>
              Both standard SQLite and FrankenSQLite have one WAL per database, appended in commit
              order. The difference is the work before commit: FrankenSQLite writers on different
              pages prepare their changes at the same time. The pager also contains an
              experimental path that stages WAL appends in per-thread lanes; it is off by default
              and not shown here.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
