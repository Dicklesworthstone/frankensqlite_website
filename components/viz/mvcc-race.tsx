"use client";

import { useReducedMotion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import { VizExposition } from "./viz-exposition";

// ---- Constants ---------------------------------------------------------------

const COLORS = [
  "#14b8a6",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
];

const LANE_H = 28;
const LOCK_X = 160;
const TREE_X = 250;
const PAGE_COUNT = 6;
/** Page 0 is the "hot" page that the Same-page slider steers writers toward. */
const HOT_PAGE = 0;

// Illustrative timings (seconds). Both engines get the same amount of work per
// transaction: page work, then a short commit step. Only the locking differs.
const PAGE_WORK_S = 1.0;
const COMMIT_S = 0.2;
const RETRY_PAUSE_S = 0.5;
const THINK_S = 0.6;
const APPROACH_SPEED = 80;

// ---- Types -------------------------------------------------------------------

interface WriterState {
  id: number;
  color: string;
  x: number;
  targetPage: number;
  /**
   * queued: walking up to start a transaction
   * writing: page work (left: under the global write lock; right: private page versions)
   * waiting: page work finished, waiting for the commit step (right side only)
   * committing: inside the serialized commit step (right side only)
   * conflict: lost first-committer-wins on its page; will retry (right side only)
   * done: committed; short pause before the next transaction
   */
  state: "queued" | "writing" | "waiting" | "committing" | "conflict" | "done";
  progress: number;
  /** Version of targetPage this writer's snapshot saw when it started (right side). */
  basePageVersion: number;
}

interface SimState {
  left: WriterState[];
  right: WriterState[];
  completedLeft: number;
  completedRight: number;
  retriesRight: number;
  /** Committed version counter per page (right side), used for the FCW check. */
  pageVersions: number[];
  elapsed: number;
}

// ---- Component ---------------------------------------------------------------

export default function MvccRace() {
  const { playSfx } = useSite();
  const prefersReducedMotion = useReducedMotion();
  const [writerCount, setWriterCount] = useState(4);
  const [conflictProb, setConflictProb] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const [state, setState] = useState<SimState>(() => initState(writerCount));

  const paramsRef = useRef({ writerCount, conflictProb, speed });
  useEffect(() => {
    paramsRef.current = { writerCount, conflictProb, speed };
  }, [writerCount, conflictProb, speed]);

  // Reset simulation when writerCount changes (render-time state adjustment)
  const [prevWriterCount, setPrevWriterCount] = useState(writerCount);
  if (prevWriterCount !== writerCount) {
    setPrevWriterCount(writerCount);
    setIsRunning(false);
    setState(initState(writerCount));
  }

  const reset = useCallback(() => {
    setIsRunning(false);
    setState(initState(paramsRef.current.writerCount));
    lastTimeRef.current = 0;
  }, []);

  // Use a ref for the RAF loop to avoid self-referencing useCallback
  const tickRef = useRef<(now: number) => void>(undefined);
  useEffect(() => {
    tickRef.current = (now: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const delta = (now - lastTimeRef.current) * paramsRef.current.speed;
      lastTimeRef.current = now;
      if (delta > 0 && delta < 200) {
        setState((prev) => simulateTick(prev, delta, paramsRef.current));
      }
      rafRef.current = requestAnimationFrame((t) => tickRef.current?.(t));
    };
  });

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame((t) => tickRef.current?.(t));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning]);

  const svgH = Math.max(writerCount * LANE_H + 40, 180);
  const elapsedSec = state.elapsed / 1000;
  const leftTps = elapsedSec > 0.3 ? Math.round(state.completedLeft / elapsedSec) : 0;
  const rightTps = elapsedSec > 0.3 ? Math.round(state.completedRight / elapsedSec) : 0;

  // Reduced motion: show static comparison instead of animation
  if (prefersReducedMotion) {
    return (
      <div className="flex flex-col gap-5 p-3 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-black/40 p-3 md:p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              C SQLite
            </div>
            <div className="text-xs font-bold text-slate-400">Single Writer Lock</div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              One writer at a time. A writer holds WAL_WRITE_LOCK from its first write until it
              commits; other writers wait or get SQLITE_BUSY.
            </p>
          </div>
          <div className="rounded-xl border border-teal-500/20 bg-black/40 p-3 md:p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500">
              FrankenSQLite
            </div>
            <div className="text-xs font-bold text-teal-400/80">Page-Level MVCC Writers</div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Writers that touch different pages do their page work at the same time, then pass
              through a short commit step one at a time. If two writers change the same page, the
              first to commit wins and the other gets SQLITE_BUSY_SNAPSHOT and retries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-3 md:p-6">
      {/* Split screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: C SQLite */}
        <Panel
          label="C SQLite"
          sublabel="Single Writer Lock"
          tps={leftTps}
          accent={false}
          svgH={svgH}
        >
          <SingleWriterViz writers={state.left} count={writerCount} svgH={svgH} />
        </Panel>

        {/* Right: FrankenSQLite */}
        <Panel
          label="FrankenSQLite"
          sublabel="Page-Level MVCC Writers"
          tps={rightTps}
          accent={true}
          svgH={svgH}
          footer={
            <>
              Same-page retries (SQLITE_BUSY_SNAPSHOT):{" "}
              <span className="font-bold text-amber-400 tabular-nums">{state.retriesRight}</span>
            </>
          }
        >
          <MultiWriterViz writers={state.right} count={writerCount} svgH={svgH} />
        </Panel>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        A toy model with made-up timings, not a benchmark. Each transaction does the same amount of
        page work on both sides; only the locking differs. On the right, writers on different pages
        overlap, the commit step (the COMMIT box) admits one writer at a time, and a writer whose
        page changed under it after its snapshot was taken loses first-committer-wins and retries.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playSfx("click");
              setIsRunning((r) => !r);
            }}
            className="flex items-center justify-center h-11 w-11 rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-teal-500/30 focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
            aria-label={isRunning ? "Pause simulation" : "Play simulation"}
          >
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={() => {
              playSfx("click");
              reset();
            }}
            className="flex items-center justify-center h-11 w-11 rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-teal-500/30 focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
            aria-label="Reset simulation"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <SliderControl
          label={`Writers: ${writerCount}`}
          min={1}
          max={8}
          step={1}
          value={writerCount}
          onChange={setWriterCount}
          width="w-24 md:w-20"
        />
        <SliderControl
          label={`Same page: ${conflictProb}%`}
          min={0}
          max={100}
          step={5}
          value={conflictProb}
          onChange={setConflictProb}
          width="w-24 md:w-20"
        />
        <SliderControl
          label={`${speed}x`}
          min={0.5}
          max={3}
          step={0.5}
          value={speed}
          onChange={setSpeed}
          width="w-20 md:w-16"
        />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              A simplified simulation of several connections writing to one database at the same
              time, once with C SQLite&apos;s locking and once with FrankenSQLite&apos;s.
            </p>
            <p>
              Each dot is one write transaction. On the right, the boxes are B-tree pages and the
              dashed line shows which page a writer is changing. The commits-per-second figures
              come from this toy model, not from measurements.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Play</strong> to start the simulation.
            </p>
            <p>
              On the <strong>C SQLite</strong> side, one writer holds the WAL write lock from its
              first write until it commits. The others wait at the lock (shown as{" "}
              <code>BUSY</code>); a real application either waits through a busy timeout or gets{" "}
              <code>SQLITE_BUSY</code>.
            </p>
            <div>
              On the <strong>FrankenSQLite</strong> side, writers on different pages do their page
              work at the same time, because <FrankenJargon term="mvcc">MVCC</FrankenJargon> gives
              each one private new versions of the{" "}
              <FrankenJargon term="btree">pages</FrankenJargon> it changes. Commit is still a short
              step taken one writer at a time.
            </div>
            <p>
              Raise <strong>Same page</strong> to send more transactions to page 0. When two
              writers changed the same page, the first to commit wins and the other gets{" "}
              <code>SQLITE_BUSY_SNAPSHOT</code> and retries with a fresh snapshot. (If the first
              writer still holds that page&apos;s lock, the second gets <code>SQLITE_BUSY</code>{" "}
              immediately instead of waiting. The model only draws the commit-time case.)
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Standard SQLite allows one writer at a time. Adding threads or cores does not widen
              the write path, so busy applications end up funneling writes through a single queue
              or handling <code>SQLITE_BUSY</code>.
            </p>
            <p>
              FrankenSQLite keeps the SQLite file format but versions individual pages, so writers
              that touch different pages stop waiting on each other while they work. Coordination
              does not disappear: commit has a short serialized step, and writers that change the
              same page conflict and one of them has to retry. How much this helps depends on how
              often your writers land on the same pages, so measure it on your own workload.
            </p>
          </>
        }
      />
    </div>
  );
}

// ---- UI sub-components -------------------------------------------------------

function Panel({
  label,
  sublabel,
  tps,
  accent,
  svgH,
  footer,
  children,
}: {
  label: string;
  sublabel: string;
  tps: number;
  accent: boolean;
  svgH: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const borderClass = accent ? "border-teal-500/20" : "border-white/5";
  const labelColor = accent ? "text-teal-500" : "text-slate-500";
  const subColor = accent ? "text-teal-400/80" : "text-slate-400";
  const tpsColor = accent ? "text-teal-400" : "text-slate-500";
  const tpsSub = accent ? "text-teal-600" : "text-slate-600";

  return (
    <div className={`rounded-xl border ${borderClass} bg-black/40 p-3 md:p-4 overflow-hidden`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${labelColor}`}>
            {label}
          </div>
          <div className={`text-xs font-bold ${subColor}`}>{sublabel}</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-black tabular-nums ${tpsColor}`}>{tps}</div>
          <div className={`text-[8px] font-black uppercase tracking-widest ${tpsSub}`}>
            commits/s (sim)
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 320 ${svgH}`} className="w-full" style={{ minHeight: svgH }}>
        {children}
      </svg>
      {footer && <div className="mt-2 text-[10px] text-slate-500">{footer}</div>}
    </div>
  );
}

function SliderControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
  width,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  width: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-bold text-slate-400 whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${width} accent-teal-500 h-6`}
      />
    </label>
  );
}

// ---- SVG viz components ------------------------------------------------------

function SingleWriterViz({
  writers,
  count,
  svgH,
}: {
  writers: WriterState[];
  count: number;
  svgH: number;
}) {
  const treeY = svgH / 2 - 20;
  const active = writers.slice(0, count);
  const writingIdx = active.findIndex((w) => w.state === "writing");

  return (
    <>
      {/* Lock barrier line */}
      <line
        x1={LOCK_X}
        y1={4}
        x2={LOCK_X}
        y2={svgH - 12}
        stroke="#ef4444"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.35}
      />
      <text
        x={LOCK_X}
        y={svgH - 2}
        textAnchor="middle"
        fill="#ef4444"
        fontSize={7}
        fontWeight={900}
        opacity={0.4}
      >
        WAL_WRITE_LOCK
      </text>

      {/* B-tree box */}
      <rect
        x={TREE_X}
        y={treeY}
        width={55}
        height={40}
        rx={5}
        fill="rgba(255,255,255,0.02)"
        stroke="#475569"
        strokeWidth={1}
        opacity={0.5}
      />
      <text
        x={TREE_X + 27}
        y={treeY + 24}
        textAnchor="middle"
        fill="#475569"
        fontSize={9}
        fontWeight={900}
      >
        B-Tree
      </text>

      {/* Writer lanes */}
      {active.map((w, i) => {
        const y = 16 + i * LANE_H;
        const isWriting = i === writingIdx;
        const isWaiting = !isWriting && w.state !== "done";
        const wx = isWriting
          ? LOCK_X + 8 + w.progress * (TREE_X - LOCK_X - 20)
          : Math.min(w.x, LOCK_X - 12);

        return (
          <g key={w.id}>
            <line
              x1={8}
              y1={y}
              x2={LOCK_X - 2}
              y2={y}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={1}
            />
            {/* Writer dot */}
            <circle cx={wx} cy={y} r={5} fill={w.color} opacity={isWaiting ? 0.4 : 0.9}>
              {isWaiting && (
                <animate
                  attributeName="opacity"
                  values="0.25;0.55;0.25"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            {/* Thread label */}
            <text x={10} y={y + 3} fill={w.color} fontSize={7} fontWeight={700} opacity={0.5}>
              T{w.id + 1}
            </text>
            {/* BUSY tag */}
            {isWaiting && w.x >= LOCK_X - 18 && (
              <text x={wx + 9} y={y + 3} fill="#ef4444" fontSize={6} fontWeight={900} opacity={0.7}>
                BUSY
              </text>
            )}
            {/* Writing line to tree */}
            {isWriting && (
              <line
                x1={wx + 5}
                y1={y}
                x2={TREE_X}
                y2={treeY + 20}
                stroke={w.color}
                strokeWidth={1}
                opacity={0.25}
                strokeDasharray="3 3"
              />
            )}
          </g>
        );
      })}
    </>
  );
}

function MultiWriterViz({
  writers,
  count,
  svgH,
}: {
  writers: WriterState[];
  count: number;
  svgH: number;
}) {
  const active = writers.slice(0, count);
  const pageH = Math.min(LANE_H - 4, (svgH - 50) / PAGE_COUNT - 4);
  const pageStartY = 10;
  const commitY = svgH - 34;
  const commitH = 14;
  const committer = active.find((w) => w.state === "committing");

  return (
    <>
      {/* Label */}
      <text
        x={LOCK_X}
        y={svgH - 2}
        textAnchor="middle"
        fill="#14b8a6"
        fontSize={7}
        fontWeight={900}
        opacity={0.4}
      >
        PAGE VERSIONS
      </text>

      {/* Page slots */}
      {Array.from({ length: PAGE_COUNT }).map((_, i) => {
        const py = pageStartY + i * (pageH + 4);
        const targeted = active.some(
          (w) =>
            w.targetPage === i &&
            (w.state === "writing" || w.state === "waiting" || w.state === "committing"),
        );
        return (
          <g key={i}>
            <rect
              x={TREE_X}
              y={py}
              width={50}
              height={pageH}
              rx={3}
              fill={targeted ? "rgba(20,184,166,0.12)" : "rgba(255,255,255,0.02)"}
              stroke={targeted ? "#14b8a6" : "rgba(255,255,255,0.06)"}
              strokeWidth={1}
            />
            <text
              x={TREE_X + 25}
              y={py + pageH / 2 + 3}
              textAnchor="middle"
              fill={targeted ? "#14b8a6" : "#334155"}
              fontSize={7}
              fontWeight={700}
            >
              {i === HOT_PAGE ? "Pg 0 hot" : `Pg ${i}`}
            </text>
          </g>
        );
      })}

      {/* Commit step: one writer at a time validates and publishes */}
      <rect
        x={TREE_X}
        y={commitY}
        width={50}
        height={commitH}
        rx={3}
        fill={committer ? `${committer.color}33` : "rgba(255,255,255,0.02)"}
        stroke={committer ? committer.color : "rgba(255,255,255,0.12)"}
        strokeWidth={1}
      />
      <text
        x={TREE_X + 25}
        y={commitY + commitH / 2 + 2.5}
        textAnchor="middle"
        fill={committer ? "#e2e8f0" : "#475569"}
        fontSize={6.5}
        fontWeight={900}
      >
        COMMIT
      </text>

      {/* Writers: page work overlaps; the commit step is serialized */}
      {active.map((w) => {
        const laneY = 16 + w.id * LANE_H;
        const pageY = pageStartY + w.targetPage * (pageH + 4) + pageH / 2;
        const atPage =
          w.state === "waiting" || w.state === "committing" || w.state === "conflict";
        const isActive = w.state === "writing" || atPage;
        const travel = atPage ? 1 : w.progress;
        const wx = isActive
          ? LOCK_X + 8 + travel * (TREE_X - LOCK_X - 20)
          : Math.min(w.x, LOCK_X + 10);
        const wy = isActive ? laneY + (pageY - laneY) * Math.min(travel * 1.5, 1) : laneY;

        return (
          <g key={w.id}>
            <line
              x1={8}
              y1={laneY}
              x2={LOCK_X}
              y2={laneY}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={1}
            />
            {/* Connection line to the page being changed */}
            {isActive && (
              <line
                x1={wx}
                y1={wy}
                x2={TREE_X}
                y2={pageY}
                stroke={w.color}
                strokeWidth={1}
                opacity={0.2}
                strokeDasharray="3 3"
              />
            )}
            {/* Connection line into the commit step */}
            {w.state === "committing" && (
              <line
                x1={wx}
                y1={wy}
                x2={TREE_X}
                y2={commitY + commitH / 2}
                stroke={w.color}
                strokeWidth={1}
                opacity={0.6}
              />
            )}
            {/* Writer dot */}
            <circle
              cx={wx}
              cy={wy}
              r={5}
              fill={w.color}
              opacity={w.state === "conflict" ? 0.55 : w.state === "waiting" ? 0.5 : 0.9}
            >
              {w.state === "conflict" && (
                <animate attributeName="r" values="5;7;5" dur="0.4s" repeatCount="indefinite" />
              )}
              {w.state === "waiting" && (
                <animate
                  attributeName="opacity"
                  values="0.3;0.7;0.3"
                  dur="1s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
            {/* Completion flash */}
            {w.state === "done" && w.progress < 0.3 && (
              <circle cx={TREE_X - 3} cy={pageY} r={3} fill="#14b8a6" opacity={0.7}>
                <animate attributeName="opacity" values="0.7;0" dur="0.4s" fill="freeze" />
                <animate attributeName="r" values="3;10" dur="0.4s" fill="freeze" />
              </circle>
            )}
            {/* Label */}
            <text x={10} y={laneY + 3} fill={w.color} fontSize={7} fontWeight={700} opacity={0.5}>
              T{w.id + 1}
            </text>
            {/* First-committer-wins loss: retry with a fresh snapshot */}
            {w.state === "conflict" && (
              <text
                x={wx - 9}
                y={wy + 3}
                textAnchor="end"
                fill="#fbbf24"
                fontSize={6}
                fontWeight={900}
              >
                BUSY_SNAPSHOT · retry
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

// ---- Simulation logic --------------------------------------------------------

function makeWriters(count: number): WriterState[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    x: 20 + Math.random() * 50,
    targetPage: i % PAGE_COUNT,
    state: "queued" as const,
    progress: 0,
    basePageVersion: 0,
  }));
}

function initState(count: number): SimState {
  return {
    left: makeWriters(count),
    right: makeWriters(count),
    completedLeft: 0,
    completedRight: 0,
    retriesRight: 0,
    pageVersions: Array.from({ length: PAGE_COUNT }, () => 0),
    elapsed: 0,
  };
}

/** With probability `samePagePct`, target the hot page; otherwise a random cold page. */
function pickPage(samePagePct: number): number {
  if (Math.random() * 100 < samePagePct) return HOT_PAGE;
  return 1 + Math.floor(Math.random() * (PAGE_COUNT - 1));
}

function simulateTick(
  prev: SimState,
  deltaMs: number,
  params: { writerCount: number; conflictProb: number },
): SimState {
  const dt = deltaMs / 1000;
  const { writerCount, conflictProb } = params;

  const left = prev.left.map((w) => ({ ...w }));
  const right = prev.right.map((w) => ({ ...w }));
  const pageVersions = [...prev.pageVersions];
  let completedLeft = prev.completedLeft;
  let completedRight = prev.completedRight;
  let retriesRight = prev.retriesRight;

  // ---- Left side: one global write lock, held from first write to commit ----
  const leftActive = left.slice(0, writerCount);
  let lockTaken = leftActive.some((w) => w.state === "writing");

  for (const w of leftActive) {
    if (w.state === "queued") {
      w.x = Math.min(w.x + dt * APPROACH_SPEED, LOCK_X - 12);
      if (!lockTaken && w.x >= LOCK_X - 16) {
        w.state = "writing";
        w.progress = 0;
        lockTaken = true;
      }
    } else if (w.state === "writing") {
      // Page work plus commit, all under the lock.
      w.progress += dt / (PAGE_WORK_S + COMMIT_S);
      if (w.progress >= 1) {
        w.state = "done";
        w.progress = 0;
        completedLeft++;
      }
    } else if (w.state === "done") {
      w.progress += dt / THINK_S;
      if (w.progress >= 1) {
        w.state = "queued";
        w.x = 20 + Math.random() * 30;
        w.progress = 0;
      }
    }
  }

  // ---- Right side: page-level MVCC ----
  // Page work overlaps. The commit step admits one writer at a time and runs
  // first-committer-wins: if the target page gained a newer committed version
  // after this writer's snapshot, the writer gets SQLITE_BUSY_SNAPSHOT and retries.
  const rightActive = right.slice(0, writerCount);
  let commitBusy = rightActive.some((w) => w.state === "committing");

  for (const w of rightActive) {
    if (w.state === "queued") {
      w.x = Math.min(w.x + dt * APPROACH_SPEED, LOCK_X + 10);
      if (w.x >= LOCK_X) {
        w.state = "writing";
        w.progress = 0;
        w.targetPage = pickPage(conflictProb);
        w.basePageVersion = pageVersions[w.targetPage];
      }
    } else if (w.state === "writing") {
      w.progress += dt / PAGE_WORK_S;
      if (w.progress >= 1) {
        w.state = "waiting";
        w.progress = 0;
      }
    } else if (w.state === "waiting") {
      if (!commitBusy) {
        commitBusy = true;
        if (pageVersions[w.targetPage] !== w.basePageVersion) {
          // Base drift on the same page: first committer already won.
          w.state = "conflict";
          w.progress = 0;
          retriesRight++;
          commitBusy = false;
        } else {
          w.state = "committing";
          w.progress = 0;
        }
      }
    } else if (w.state === "committing") {
      w.progress += dt / COMMIT_S;
      if (w.progress >= 1) {
        pageVersions[w.targetPage] += 1;
        w.state = "done";
        w.progress = 0;
        completedRight++;
      }
    } else if (w.state === "conflict") {
      w.progress += dt / RETRY_PAUSE_S;
      if (w.progress >= 1) {
        // Retry the same transaction from a fresh snapshot.
        w.state = "writing";
        w.progress = 0;
        w.basePageVersion = pageVersions[w.targetPage];
      }
    } else if (w.state === "done") {
      w.progress += dt / THINK_S;
      if (w.progress >= 1) {
        w.state = "queued";
        w.x = 20 + Math.random() * 30;
        w.progress = 0;
      }
    }
  }

  return {
    left,
    right,
    completedLeft,
    completedRight,
    retriesRight,
    pageVersions,
    elapsed: prev.elapsed + deltaMs,
  };
}
