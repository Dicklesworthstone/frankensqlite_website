"use client";

import { motion } from "framer-motion";
import { Activity, RefreshCw, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

type Regime = "oltp" | "bulk" | "idle";

interface DataPoint {
  id: number;
  val: number;
  regime: Regime;
  /** The detector's most likely run length after this observation. */
  runLength: number;
}

interface DetectorStatus {
  /** The workload was switched and the detector has not flagged it yet. */
  pending: boolean;
  /** Observations between the last switch and the detector flagging it. */
  lastLag: number | null;
  /** Change points flagged with no switch behind them. */
  falseAlarms: number;
}

// A small, real BOCPD (Adams & MacKay 2007): Gaussian observations with known
// noise and a Normal prior on each segment's mean. The engine's BocpdMonitor
// uses Normal-Gamma / Beta-Binomial models; the hazard below matches its default.
const HAZARD = 1 / 250;
const OBS_VAR = 6 ** 2; // assumed observation noise (illustrative)
const PRIOR_MEAN = 50;
const PRIOR_VAR = 30 ** 2;
// Prune run-length hypotheses below this probability, and keep at most MAX_HYPOTHESES.
const MIN_PROB = 1e-8;
const MAX_HYPOTHESES = 100;

interface BocpdState {
  runs: number[]; // run length of each surviving hypothesis
  probs: number[]; // P(run length = runs[i] | data so far)
  means: number[]; // posterior mean of the segment mean, per hypothesis
  vars: number[]; // posterior variance of the segment mean, per hypothesis
}

const initialBocpd = (): BocpdState => ({
  runs: [0],
  probs: [1],
  means: [PRIOR_MEAN],
  vars: [PRIOR_VAR],
});

function normalPdf(x: number, mean: number, variance: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance);
}

/** One BOCPD update. Returns the new state and the most likely run length. */
function bocpdStep(state: BocpdState, x: number): { next: BocpdState; mapRunLength: number } {
  // Index 0 is the "a new run starts here" hypothesis; it carries only the prior.
  const runs = [0];
  const probs = [0];
  const means = [PRIOR_MEAN];
  const vars = [PRIOR_VAR];
  let changeMass = 0;
  for (let i = 0; i < state.runs.length; i++) {
    const w = state.probs[i] * normalPdf(x, state.means[i], state.vars[i] + OBS_VAR);
    changeMass += w * HAZARD;
    const v = 1 / (1 / state.vars[i] + 1 / OBS_VAR);
    runs.push(state.runs[i] + 1); // the run grows by one
    probs.push(w * (1 - HAZARD));
    vars.push(v);
    means.push(v * (state.means[i] / state.vars[i] + x / OBS_VAR));
  }
  probs[0] = changeMass;

  const total = probs.reduce((a, b) => a + b, 0);
  if (!(total > 0) || !Number.isFinite(total)) {
    return { next: initialBocpd(), mapRunLength: 0 };
  }

  let keep = probs.map((_, i) => i).filter((i) => probs[i] / total >= MIN_PROB);
  if (keep.length > MAX_HYPOTHESES) {
    keep = keep.sort((a, b) => probs[b] - probs[a]).slice(0, MAX_HYPOTHESES);
  }
  const kept = keep.reduce((sum, i) => sum + probs[i], 0);
  const next: BocpdState = {
    runs: keep.map((i) => runs[i]),
    probs: keep.map((i) => probs[i] / kept),
    means: keep.map((i) => means[i]),
    vars: keep.map((i) => vars[i]),
  };

  let best = 0;
  for (let j = 1; j < next.probs.length; j++) {
    if (next.probs[j] > next.probs[best]) best = j;
  }
  return { next, mapRunLength: next.runs[best] };
}

function ordinal(n: number): string {
  return ["first", "second", "third", "fourth", "fifth"][n - 1] ?? `${n}th`;
}

function sampleThroughput(regime: Regime): number {
  if (regime === "oltp") return 70 + Math.random() * 20; // 70-90
  if (regime === "bulk") return 20 + Math.random() * 10; // 20-30
  return 5 + Math.random() * 5; // 5-10
}

export default function BocpdRegime() {
  const { playSfx } = useSite();
  const [data, setData] = useState<DataPoint[]>([]);
  const [regime, setRegime] = useState<Regime>("oltp");
  const [isSimulating, setIsSimulating] = useState(false);
  const [status, setStatus] = useState<DetectorStatus>({
    pending: false,
    lastLag: null,
    falseAlarms: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const regimeRef = useRef<Regime>(regime);
  const bocpdRef = useRef<BocpdState>(initialBocpd());
  const tickRef = useRef(0);
  const prevMapRef = useRef(0);
  const lastRegimeRef = useRef<Regime>(regime);
  const switchTickRef = useRef<number | null>(null);

  useEffect(() => {
    regimeRef.current = regime;
  }, [regime]);

  useEffect(() => {
    if (!isSimulating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const current = regimeRef.current;

      if (current !== lastRegimeRef.current) {
        lastRegimeRef.current = current;
        switchTickRef.current = tick;
      }

      const val = sampleThroughput(current);
      const { next, mapRunLength } = bocpdStep(bocpdRef.current, val);
      bocpdRef.current = next;

      // A drop in the most likely run length means the detector now believes
      // a new segment started recently.
      const flagged = tick > 1 && mapRunLength < prevMapRef.current;
      prevMapRef.current = mapRunLength;

      if (flagged) {
        const switchTick = switchTickRef.current;
        switchTickRef.current = null;
        setStatus((s) =>
          switchTick !== null
            ? { ...s, pending: false, lastLag: tick - switchTick }
            : { ...s, falseAlarms: s.falseAlarms + 1 },
        );
      } else if (switchTickRef.current !== null) {
        setStatus((s) => (s.pending ? s : { ...s, pending: true }));
      }

      setData((prev) =>
        [...prev, { id: tick, val, regime: current, runLength: mapRunLength }].slice(-30),
      );
    }, 400);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating]);

  const maxVal = 100;
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <VizContainer
      title="Bayesian Online Change-Point Detection"
      description="BOCPD watches a stream of measurements and estimates how long the current regime has lasted, so it can notice when a workload changes character. FrankenSQLite has a BOCPD monitor in fsqlite-mvcc, but nothing in the engine calls it yet; GC, checkpointing and eviction do not adapt to it."
      minHeight={450}
      status="dormant"
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
              Simulated Telemetry
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
              <Activity className="w-3 h-3" /> Commit throughput (simulated, arbitrary units)
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
              <FrankenJargon term="bocpd">BOCPD</FrankenJargon> most likely run length
              {latest ? ` (${latest.runLength})` : ""}
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
        <div className="min-h-16 rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-4">
          <Zap
            className={`w-5 h-5 ${regime === "oltp" ? "text-teal-400" : regime === "bulk" ? "text-amber-400" : "text-slate-500"}`}
          />
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {data.length === 0
              ? "Press play to stream simulated throughput into the detector."
              : status.pending
                ? "Workload switched. The detector is still collecting evidence that this is a new regime and not noise."
                : status.lastLag !== null
                  ? `Change point flagged at the ${ordinal(status.lastLag + 1)} point of the new regime; the run length restarted.${status.falseAlarms > 0 ? ` False alarms so far: ${status.falseAlarms}.` : ""}`
                  : "Stable regime. The run length grows by one with every observation."}
          </p>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a small but real{" "}
              <FrankenJargon term="bocpd">
                Bayesian Online Change-Point Detection (BOCPD)
              </FrankenJargon>{" "}
              detector (Adams and MacKay, 2007) running in your browser on simulated throughput.
            </div>
            <p>
              BOCPD keeps a probability for every possible &ldquo;run length&rdquo;: the number of
              observations since the last change. Each new point either extends the current run or
              starts a new one, weighted by how well each hypothesis predicts it. The bottom chart
              shows the most likely run length after each point.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Press play, then switch between <strong>Idle Night</strong>,{" "}
              <strong>OLTP Rush</strong>, and <strong>Bulk Load</strong>.
            </p>
            <p>
              Within a regime the run length climbs by one per point. After a switch it drops back
              near zero, often on the first new point when the jump is large, and within a few
              points when it is smaller (try Idle to Bulk): one odd value could be noise, so the
              detector waits until a new regime explains the data better. The message under the
              charts reports the delay. The detector never sees which button you pressed, only the
              numbers.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Fixed tuning thresholds (&ldquo;run GC every N commits&rdquo;) are chosen for one
              workload and can be wrong for the next. A change-point signal tells a tuning layer
              when its old measurements stopped being representative, without picking a window
              size for a moving average.
            </p>
            <div>
              Where it stands: <code>fsqlite-mvcc</code> contains <code>BocpdMonitor</code>{" "}
              (Normal-Gamma and Beta-Binomial models, hazard 1/250) and tests for it, but no engine
              code calls it. <FrankenJargon term="mvcc">MVCC</FrankenJargon> garbage collection,
              checkpointing and page eviction run on their normal policies. A policy controller
              that accepts a regime-shift flag exists, and only harness tests drive it. The test
              harness also uses a simpler windowed detector to classify drift in conformance
              mismatch rates.
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
