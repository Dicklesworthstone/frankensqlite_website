"use client";

import { motion } from "framer-motion";
import { LineChart, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface LatencyPoint {
  id: number;
  val: number;
  /** The bound in force when this point arrived (null while calibrating). */
  bound: number | null;
  above: boolean;
}

const ALPHA = 0.1; // target: at most 10% of new points above the bound
const WINDOW = 39; // calibration samples n (the most recent points)

/**
 * One-sided split-conformal upper bound: the ceil((n+1)(1-alpha))-th smallest of
 * the n calibration scores. Abstains (null) when n is too small for alpha.
 */
function conformalBound(scores: number[], alpha: number): number | null {
  const n = scores.length;
  const k = Math.ceil((n + 1) * (1 - alpha));
  if (n === 0 || k > n) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  return sorted[k - 1];
}

function ordinal(k: number): string {
  const tens = k % 100;
  if (tens >= 11 && tens <= 13) return `${k}th`;
  const suffix = ["th", "st", "nd", "rd"][k % 10] ?? "th";
  return `${k}${suffix}`;
}

/** Skewed latency with an occasional long-tail spike (illustrative units). */
function sampleLatency(slow: boolean): number {
  const base = slow ? 45 + Math.random() * 25 : 20 + Math.random() * 30;
  const isSpike = Math.random() < 0.05;
  return isSpike ? Math.min(100, base + 30 + Math.random() * 30) : base;
}

export default function ConformalCalibration() {
  const [data, setData] = useState<LatencyPoint[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [slow, setSlow] = useState(false);
  const [stats, setStats] = useState({ checked: 0, above: 0 });
  const tickRef = useRef(0);
  const dataRef = useRef<LatencyPoint[]>([]);
  const slowRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    slowRef.current = slow;
  }, [slow]);

  useEffect(() => {
    if (!isSimulating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const prev = dataRef.current;
      // The bound comes only from earlier points, then the new point is judged against it.
      const bound = conformalBound(
        prev.slice(-WINDOW).map((p) => p.val),
        ALPHA,
      );
      const val = sampleLatency(slowRef.current);
      const above = bound !== null && val > bound;
      const next = [...prev, { id: tickRef.current, val, bound, above }].slice(-40);
      dataRef.current = next;
      setData(next);
      if (bound !== null) {
        setStats((s) => ({ checked: s.checked + 1, above: s.above + (above ? 1 : 0) }));
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating]);

  const reset = () => {
    setIsSimulating(false);
    setSlow(false);
    dataRef.current = [];
    tickRef.current = 0;
    setData([]);
    setStats({ checked: 0, above: 0 });
  };

  const currentBound = conformalBound(
    data.slice(-WINDOW).map((p) => p.val),
    ALPHA,
  );
  const n = Math.min(data.length, WINDOW);

  return (
    <VizContainer
      title="Conformal Latency Bounds"
      description="Latency is skewed and long-tailed, so mean ± standard deviation bands can mislead. A conformal bound uses the recent samples themselves and comes with a distribution-free coverage guarantee, as long as the next sample behaves like the recent ones. FrankenSQLite uses such bounds in a few specific runtime paths; using them to gate performance regressions is a design target."
      minHeight={450}
      status="partial"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative">
        {/* Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isSimulating ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-teal-500 text-black border border-teal-400 hover:bg-teal-400"}`}
            >
              <LineChart className="w-4 h-4" />
              {isSimulating ? "Pause" : "Stream Latencies"}
            </button>
            <button
              onClick={() => setSlow(!slow)}
              aria-pressed={slow}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${slow ? "bg-red-500/20 text-red-300 border-red-500/50" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"}`}
            >
              Slow disk: {slow ? "on" : "off"}
            </button>
            <button
              onClick={reset}
              className="text-xs font-bold text-slate-500 hover:text-white transition-colors px-2"
            >
              Reset
            </button>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500" /> At or below bound
              <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Above bound
            </div>
            <div>
              Above: {stats.above} of {stats.checked}
              {stats.checked > 0
                ? ` (${((stats.above / stats.checked) * 100).toFixed(0)}%, target ≤ ${ALPHA * 100}%)`
                : ""}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative border-l border-b border-white/10 mx-4 mb-4">
          {/* Y-axis Labels */}
          <div className="absolute -left-6 top-0 text-[8px] text-slate-500 font-mono">100</div>
          <div className="absolute -left-6 bottom-0 text-[8px] text-slate-500 font-mono">0</div>

          {/* Conformal Boundary Line */}
          {currentBound !== null && (
            <motion.div
              className="absolute left-0 right-0 border-t-2 border-dashed border-purple-500/50 z-10 flex items-center"
              animate={{ bottom: `${currentBound}%` }}
              transition={{ type: "spring", bounce: 0 }}
            >
              <span className="absolute -top-5 right-2 text-[10px] font-bold text-purple-400 bg-black/80 px-2 py-0.5 rounded backdrop-blur">
                q = {ordinal(Math.ceil((n + 1) * (1 - ALPHA)))} smallest of last {n} (α ={" "}
                {ALPHA})
              </span>
            </motion.div>
          )}

          {/* Data Bars */}
          <div className="absolute inset-0 flex items-end gap-1 px-1 overflow-hidden">
            {data.map((d) => (
              <motion.div
                key={d.id}
                initial={{ height: 0 }}
                animate={{ height: `${d.val}%` }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex-1 rounded-t-sm ${d.above ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : d.bound === null ? "bg-slate-600/80" : "bg-teal-500/80"}`}
              />
            ))}
            {data.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600 font-mono">
                Simulated latency samples (illustrative units)
              </div>
            )}
          </div>
        </div>

        {/* Math Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                Mean ± 2σ Assumes a Shape
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                A mean ± 2σ band is calibrated for a bell curve. Latency is usually skewed, with a
                long tail from things like fsync stalls and page splits, so the share of samples
                outside the band can be far from what the formula suggests.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                Conformal Coverage
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If the next sample is exchangeable with the last n (roughly: same conditions, no
                drift), then P(R_{"{n+1}"} ≤ q) ≥ 1 − α for{" "}
                <strong className="text-purple-300">any distribution</strong>. When conditions
                change, that assumption fails and the guarantee no longer applies.
              </p>
            </div>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a one-sided{" "}
              <FrankenJargon term="conformal-prediction">split-conformal</FrankenJargon> upper bound
              computed in your browser over simulated, skewed latency samples. Before each new
              sample arrives, the dashed line is set from the previous {WINDOW} samples: sort them
              and take the ⌈(n+1)(1−α)⌉-th smallest.
            </div>
            <p>
              Grey bars arrived while there were too few samples for a bound. Teal bars are at or
              below the bound that was in force when they arrived; red bars are above it.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Press <strong>Stream Latencies</strong>. Even with nothing changing, roughly one
              sample in ten lands above the line. That is what α = 0.1 means: the bound promises
              coverage, not the absence of outliers.
            </p>
            <p>
              Now turn <strong>Slow disk</strong> on. Latencies shift up, the recent window no
              longer resembles new samples, and red bars pile up until the window fills with slow
              samples and the bound catches up. A run of samples above the bound is the useful
              signal; a single one usually is not.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              The bound is built from observed samples, so it needs no assumption about the shape
              of the distribution, only that the near future resembles the recent past.
            </p>
            <div>
              Where FrankenSQLite uses it: on Linux, the default io_uring file backend keeps a
              window of recent read and write latencies and an upper bound (the p99 plus a
              conformal margin); an I/O slower than that bound turns io_uring off and later I/O
              uses the plain Unix path. <code>PRAGMA fsqlite.retry_slo_ms</code> (off by default)
              uses a conformal bound on recent commit latencies to stop retrying on{" "}
              <code>SQLITE_BUSY</code> once the time already spent plus the predicted commit time
              would pass the target. Using{" "}
              <FrankenJargon term="conformal-prediction">conformal</FrankenJargon> bounds to judge
              benchmark regressions is a design target, not a current release gate.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
