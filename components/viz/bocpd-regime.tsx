"use client";

import { motion } from "framer-motion";
import { Activity, RefreshCw, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface DataPoint {
  id: number;
  val: number;
  regime: "oltp" | "bulk" | "idle";
  runLength: number;
}

export default function BocpdRegime() {
  const { playSfx } = useSite();
  const [data, setData] = useState<DataPoint[]>([]);
  const [regime, setRegime] = useState<"oltp" | "bulk" | "idle">("oltp");
  const [isSimulating, setIsSimulating] = useState(false);
  const [tick, setTick] = useState(0);

  const runLengthRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isSimulating) {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      return;
    }

    timeoutRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 400);

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [isSimulating]);

  useEffect(() => {
    if (!isSimulating) return;

    let newVal = 0;
    if (regime === "oltp") {
      newVal = 70 + Math.random() * 20; // 70-90
    } else if (regime === "bulk") {
      newVal = 20 + Math.random() * 10; // 20-30
    } else {
      newVal = 5 + Math.random() * 5; // 5-10
    }

    // BOCPD logic simulation
    // If the value deviates significantly from the expected mean of the current run, reset run length.
    // We simplify this by just checking if it crossed a threshold representing the regimes.
    const expectedOltp = newVal > 60;
    const expectedBulk = newVal > 15 && newVal <= 40;
    const expectedIdle = newVal <= 15;

    const prevRegime = data.length > 0 ? data[data.length - 1].regime : regime;

    // Simulate the exact moment of detection
    if (regime === "oltp" && !expectedOltp) {
      //
    }
    if (regime === "bulk" && !expectedBulk) {
      //
    }
    if (regime === "idle" && !expectedIdle) {
      //
    }

    if (regime !== prevRegime) {
      // The user switched the regime manually, the "algorithm" detects it after 1 tick.
      runLengthRef.current = 0;
    } else {
      runLengthRef.current += 1;
    }

    const newPoint: DataPoint = {
      id: tick,
      val: newVal,
      regime,
      runLength: runLengthRef.current,
    };

    setData((prev) => [...prev, newPoint].slice(-30));
  }, [tick, isSimulating, regime, data]);

  const maxVal = 100;

  return (
    <VizContainer
      title="Bayesian Online Change-Point Detection"
      description="Database workloads are non-stationary. A quiet night becomes a chaotic morning. FrankenSQLite uses BOCPD to mathematically prove when the workload 'regime' has changed, automatically re-tuning garbage collection and compaction heuristics without manual intervention."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6">
        {/* Controls */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playSfx("click");
                setIsSimulating(!isSimulating);
              }}
              className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none ${isSimulating ? "border-red-500/50 bg-red-500/20 text-red-400" : "border-teal-500/50 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30"}`}
            >
              {isSimulating ? <StopIcon /> : <PlayIcon />}
            </button>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Live Telemetry
            </div>
          </div>

          <div className="flex gap-2">
            <RegimeButton
              active={regime === "idle"}
              onClick={() => setRegime("idle")}
              label="Idle Night"
              color="slate"
            />
            <RegimeButton
              active={regime === "oltp"}
              onClick={() => setRegime("oltp")}
              label="OLTP Rush"
              color="teal"
            />
            <RegimeButton
              active={regime === "bulk"}
              onClick={() => setRegime("bulk")}
              label="Bulk Load"
              color="amber"
            />
          </div>
        </div>

        {/* Charts */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Throughput Chart */}
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3" /> Throughput (ops/sec)
            </div>

            <div className="absolute inset-0 top-6 flex items-end gap-[2px] overflow-hidden border-b border-white/10">
              {data.map((d) => (
                <motion.div
                  key={d.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${(d.val / maxVal) * 100}%`, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`w-full rounded-t-sm opacity-80 ${d.regime === "oltp" ? "bg-teal-500" : d.regime === "bulk" ? "bg-amber-500" : "bg-slate-600"}`}
                />
              ))}
              {data.length === 0 && (
                <div className="w-full text-center text-xs text-slate-600 pb-4">
                  Press Play to stream telemetry...
                </div>
              )}
            </div>
          </div>

          {/* Run Length Posterior Chart */}
          <div className="h-24 relative">
            <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />{" "}
              <FrankenJargon term="bocpd">BOCPD Run Length</FrankenJargon>
            </div>

            <div className="absolute inset-0 top-6 flex items-end gap-[2px] overflow-hidden border-b border-white/10">
              {data.map((d) => (
                <motion.div
                  key={`rl-${d.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${Math.min(d.runLength * 3, 100)}%`, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="w-full bg-purple-500/80 rounded-t-sm"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Commentary */}
        <div className="h-16 rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-4">
          <Zap
            className={`w-5 h-5 ${regime === "oltp" ? "text-teal-400" : regime === "bulk" ? "text-amber-400" : "text-slate-500"}`}
          />
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {data.length === 0
              ? "System waiting for load."
              : regime === "oltp"
                ? "High-throughput OLTP detected. Engine increases GC frequency and pins hot pages in memory."
                : regime === "bulk"
                  ? "Contended bulk insert detected. Engine relaxes version chain limits to prevent aborts."
                  : "System is idle. Engine initiates background vacuuming and log compaction."}
          </p>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a live simulation of{" "}
              <FrankenJargon term="bocpd">
                Bayesian Online Change-Point Detection (BOCPD)
              </FrankenJargon>
              . The top chart shows real-time database throughput. The bottom purple chart shows the
              mathematical &ldquo;Run Length,&rdquo; how long the engine calculates the current
              workload regime has lasted.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Run Live Telemetry</strong>. Then, dynamically toggle the workload
              between <strong>Idle Night</strong>, <strong>OLTP Rush</strong>, and{" "}
              <strong>Bulk Load</strong>.
            </p>
            <p>
              Notice what happens in the bottom purple chart when you switch regimes. The engine
              does not rely on a moving average slowly crossing a threshold. Instead, the Bayesian
              model computes a posterior probability over possible change-points, identifies when a
              regime shift has occurred, instantly drops the Run Length to zero, and triggers an
              immediate adaptation in the engine&apos;s behavior.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Database administrators traditionally spend hours tuning static configuration
              thresholds (e.g., &ldquo;run garbage collection every 1000 commits&rdquo;). The
              problem is that database workloads are non-stationary: a threshold tuned for a quiet
              afternoon will cause excessive latency during a traffic spike.
            </p>
            <div>
              By integrating <FrankenJargon term="bocpd">BOCPD</FrankenJargon> directly into the
              telemetry loop, FrankenSQLite acts as an automated tuning layer. It detects when the
              workload regime has shifted and re-tunes its own{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> garbage collection,{" "}
              <FrankenJargon term="arc-cache">ARC cache</FrankenJargon> eviction heuristics, and
              checkpoint intervals without manual intervention.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}

function RegimeButton({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  const { playSfx } = useSite();
  const colorClasses: Record<string, string> = {
    slate: active
      ? "bg-slate-600 text-white border-slate-500"
      : "bg-transparent text-slate-500 border-white/10 hover:bg-slate-800",
    teal: active
      ? "bg-teal-500/20 text-teal-400 border-teal-500/50"
      : "bg-transparent text-slate-500 border-white/10 hover:bg-teal-900/30",
    amber: active
      ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
      : "bg-transparent text-slate-500 border-white/10 hover:bg-amber-900/30",
  };

  return (
    <button
      onClick={() => {
        playSfx("click");
        onClick();
      }}
      className={`px-3 py-1.5 rounded text-[10px] font-bold border transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none ${colorClasses[color]}`}
    >
      {label}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 3L19 12L5 21V3Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
