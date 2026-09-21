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

// ---- Types -------------------------------------------------------------------

interface WriterState {
  id: number;
  color: string;
  x: number;
  targetPage: number;
  state: "queued" | "writing" | "done" | "conflict";
  progress: number;
}

interface SimState {
  left: WriterState[];
  right: WriterState[];
  completedLeft: number;
  completedRight: number;
  elapsed: number;
}

// ---- Component ---------------------------------------------------------------

export default function MvccRace() {
  const { playSfx } = useSite();
  const prefersReducedMotion = useReducedMotion();
  const [writerCount, setWriterCount] = useState(4);
  const [conflictProb, setConflictProb] = useState(20);
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
              Only one writer at a time. Others wait at WAL_WRITE_LOCK, causing contention under
              concurrent load.
            </p>
          </div>
          <div className="rounded-xl border border-teal-500/20 bg-black/40 p-3 md:p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500">
              FrankenSQLite
            </div>
            <div className="text-xs font-bold text-teal-400/80">MVCC Parallel Writers</div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Multiple writers operate in parallel on separate pages via MVCC. Conflicts resolved by
              First-Committer-Wins.
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
          sublabel="MVCC Parallel Writers"
          tps={rightTps}
          accent={true}
          svgH={svgH}
        >
          <MultiWriterViz writers={state.right} count={writerCount} svgH={svgH} />
        </Panel>
      </div>

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
          label={`Conflict: ${conflictProb}%`}
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
              This is a live race between C SQLite (the standard implementation) and FrankenSQLite
              under a heavy, multi-writer workload.
            </p>
            <p>
              Each animated bar represents a database transaction trying to write data. The blocks
              falling into the bars are the individual rows they are writing.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Play</strong> to start the simulation.
            </p>
            <p>
              Watch the <strong>C SQLite</strong> side. Notice how only one transaction can make
              progress at a time. The others turn amber and show <code>SQLITE_BUSY</code> because
              they are blocked by a global write lock.
            </p>
            <div>
              Now watch the <strong>FrankenSQLite</strong> side. All four transactions are moving
              forward simultaneously because <FrankenJargon term="mvcc">MVCC</FrankenJargon>{" "}
              isolates their writes at the <FrankenJargon term="btree">page level</FrankenJargon>.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              Applications serving thousands of concurrent users need concurrent write access.
              Standard SQLite serializes all writes behind a single global lock; when multiple
              connections attempt simultaneous writes, they receive <code>SQLITE_BUSY</code> errors,
              causing queueing delays and application-level timeouts.
            </p>
            <p>
              FrankenSQLite removes this global lock entirely. By using{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon>, it achieves substantially higher
              write throughput, supporting hundreds of concurrent writers with per-page conflict
              granularity rather than requiring a migration to PostgreSQL or MySQL for server
              workloads.
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
  children,
}: {
  label: string;
  sublabel: string;
  tps: number;
  accent: boolean;
  svgH: number;
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
            writes/sec
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 320 ${svgH}`} className="w-full" style={{ minHeight: svgH }}>
        {children}
      </svg>
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
  const pageH = Math.min(LANE_H - 4, (svgH - 30) / PAGE_COUNT - 2);
  const pageStartY = 10;

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
        MVCC_PAGES
      </text>

      {/* Page slots */}
      {Array.from({ length: PAGE_COUNT }).map((_, i) => {
        const py = pageStartY + i * (pageH + 4);
        const targeted = active.some(
          (w) => w.targetPage === i && (w.state === "writing" || w.state === "conflict"),
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
              Pg {i}
            </text>
          </g>
        );
      })}

      {/* Writers — all can be active */}
      {active.map((w) => {
        const laneY = 16 + w.id * LANE_H;
        const pageY = pageStartY + w.targetPage * (pageH + 4) + pageH / 2;
        const isActive = w.state === "writing" || w.state === "conflict";
        const wx = isActive
          ? LOCK_X + 8 + w.progress * (TREE_X - LOCK_X - 20)
          : Math.min(w.x, LOCK_X + 10);
        const wy = isActive ? laneY + (pageY - laneY) * Math.min(w.progress * 1.5, 1) : laneY;

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
            {/* Connection line */}
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
            {/* Writer dot */}
            <circle
              cx={wx}
              cy={wy}
              r={5}
              fill={w.color}
              opacity={w.state === "conflict" ? 0.55 : 0.9}
            >
              {w.state === "conflict" && (
                <animate attributeName="r" values="5;7;5" dur="0.4s" repeatCount="indefinite" />
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
            {/* FCW conflict tag */}
            {w.state === "conflict" && (
              <text x={wx + 9} y={wy + 3} fill="#fbbf24" fontSize={6} fontWeight={900}>
                FCW
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
  }));
}

function initState(count: number): SimState {
  return {
    left: makeWriters(count),
    right: makeWriters(count),
    completedLeft: 0,
    completedRight: 0,
    elapsed: 0,
  };
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
  let completedLeft = prev.completedLeft;
  let completedRight = prev.completedRight;

  // ---- Left side: Single writer lock ----
  const leftActive = left.slice(0, writerCount);
  let lockTaken = leftActive.some((w) => w.state === "writing");

  for (const w of leftActive) {
    if (w.state === "queued") {
      w.x = Math.min(w.x + dt * 70, LOCK_X - 12);
      if (!lockTaken && w.x >= LOCK_X - 16) {
        w.state = "writing";
        w.progress = 0;
        lockTaken = true;
      }
    } else if (w.state === "writing") {
      w.progress += dt * 1.0;
      if (w.progress >= 1) {
        w.state = "done";
        w.progress = 0;
        completedLeft++;
      }
    } else if (w.state === "done") {
      w.progress += dt * 1.5;
      if (w.progress >= 1) {
        w.state = "queued";
        w.x = 20 + Math.random() * 30;
        w.progress = 0;
        w.targetPage = Math.floor(Math.random() * PAGE_COUNT);
      }
    }
  }

  // ---- Right side: MVCC parallel ----
  const rightActive = right.slice(0, writerCount);

  for (const w of rightActive) {
    if (w.state === "queued") {
      w.x = Math.min(w.x + dt * 100, LOCK_X + 10);
      if (w.x >= LOCK_X) {
        w.state = "writing";
        w.progress = 0;
      }
    } else if (w.state === "writing") {
      // Check for same-page conflict
      const samePageWriters = rightActive.filter(
        (o) =>
          o.id !== w.id &&
          o.targetPage === w.targetPage &&
          (o.state === "writing" || o.state === "conflict"),
      );
      if (samePageWriters.length > 0 && Math.random() < (conflictProb / 100) * dt * 3) {
        w.state = "conflict";
      } else {
        w.progress += dt * 2.0;
        if (w.progress >= 1) {
          w.state = "done";
          w.progress = 0;
          completedRight++;
        }
      }
    } else if (w.state === "conflict") {
      // FCW resolution takes some time
      w.progress += dt * 1.2;
      if (w.progress >= 1) {
        w.state = "done";
        w.progress = 0;
        completedRight++;
      }
    } else if (w.state === "done") {
      w.progress += dt * 2;
      if (w.progress >= 1) {
        w.state = "queued";
        w.x = 20 + Math.random() * 30;
        w.progress = 0;
        w.targetPage = Math.floor(Math.random() * PAGE_COUNT);
      }
    }
  }

  return {
    left,
    right,
    completedLeft,
    completedRight,
    elapsed: prev.elapsed + deltaMs,
  };
}
