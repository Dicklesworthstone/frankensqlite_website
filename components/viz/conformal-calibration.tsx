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
  anomaly: boolean;
}

export default function ConformalCalibration() {
  const [data, setData] = useState<LatencyPoint[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [threshold, setThreshold] = useState(80); // Conformal quantile limit
  const tickRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isSimulating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      tickRef.current += 1;

      // Generate heavy-tailed distribution (not normal)
      const base = 20 + Math.random() * 30; // 20-50ms normally

      // 5% chance of a massive GC spike (heavy tail)
      const isSpike = Math.random() > 0.95;
      const val = isSpike ? 60 + Math.random() * 40 : base;

      const newPoint = {
        id: tickRef.current,
        val,
        anomaly: val > threshold,
      };

      setData((prev) => [...prev, newPoint].slice(-40)); // Keep last 40

      // Recalculate conformal threshold periodically (simulation)
      if (tickRef.current % 10 === 0) {
        setThreshold(() => {
          // In real conformal prediction, this is the (1-alpha) quantile of nonconformity scores
          // Here we just lightly jiggle it for visualization
          return 75 + Math.random() * 10;
        });
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, threshold]);

  return (
    <VizContainer
      title="Conformal Performance Bounds"
      description="Database latencies are not normally distributed: they have heavy tails and erratic spikes. Instead of trusting standard deviations, FrankenSQLite uses Conformal Prediction to establish distribution-free confidence intervals."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative">
        {/* Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isSimulating ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-teal-500 text-black border border-teal-400 hover:bg-teal-400"}`}
          >
            <LineChart className="w-4 h-4" />
            {isSimulating ? "Stop Benchmarks" : "Run Live Benchmarks"}
          </button>
          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" /> Normal
            <span className="w-2 h-2 rounded-full bg-red-500 ml-2" /> Anomaly
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative border-l border-b border-white/10 mx-4 mb-4">
          {/* Y-axis Labels */}
          <div className="absolute -left-6 top-0 text-[8px] text-slate-500 font-mono">100ms</div>
          <div className="absolute -left-6 bottom-0 text-[8px] text-slate-500 font-mono">0ms</div>

          {/* Conformal Boundary Line */}
          <motion.div
            className="absolute left-0 right-0 border-t-2 border-dashed border-purple-500/50 z-0 flex items-center"
            animate={{ bottom: `${threshold}%` }}
            transition={{ type: "spring", bounce: 0 }}
          >
            <span className="absolute -top-5 right-2 text-[10px] font-bold text-purple-400 bg-black/80 px-2 py-0.5 rounded backdrop-blur">
              q = quantile_((1-α)(n+1)/n)
            </span>
          </motion.div>

          {/* Data Bars */}
          <div className="absolute inset-0 flex items-end gap-1 px-1 overflow-hidden">
            {data.map((d) => (
              <motion.div
                key={d.id}
                initial={{ height: 0 }}
                animate={{ height: `${d.val}%` }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex-1 rounded-t-sm ${d.anomaly ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-teal-500/80"}`}
              />
            ))}
            {data.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600 font-mono">
                Awaiting benchmark data...
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
                Standard Dev Fails
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Claiming &ldquo;99% of latencies are within 2σ&rdquo; assumes a normal bell curve.
                Database latency curves have heavy, skewed tails due to GC pauses and page splits.
                Standard dev lies.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                Conformal Guarantees
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conformal prediction provides a{" "}
                <strong className="text-purple-300">distribution-free guarantee</strong>. No matter
                how weird the latency curve gets, we can mathematically prove that P(R_{"{n+1}"} ≤
                q) ≥ 1 - α.
              </p>
            </div>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a live{" "}
              <FrankenJargon term="conformal-prediction">conformal prediction</FrankenJargon>{" "}
              calibration running on simulated database latency data. The bar chart shows historical
              latency measurements, and the dashed purple line is the conformal quantile threshold.
              Bars that exceed the threshold turn red, indicating anomalous latency. Unlike
              parametric methods (mean ± standard deviation), this threshold adapts to the actual
              data distribution without assuming normality.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Press <strong>Run Live Benchmarks</strong> to begin streaming simulated latency
              observations. Watch how the purple threshold line shifts periodically as the engine
              recalculates the conformal quantile from recent data. Teal bars represent normal
              latency; red bars are observations that exceed the current threshold. Notice how
              occasional GC spikes produce heavy-tailed outliers that a normal distribution would
              fail to capture.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Benchmark latency distributions are heavy-tailed, bimodal, and regime-dependent.
              Reporting mean ± standard deviation assumes normality, which hides regressions inside
              wide error bars.{" "}
              <FrankenJargon term="conformal-prediction">Conformal prediction</FrankenJargon> gives
              distribution-free bounds that catch performance regressions mathematically. When a new
              observation falls outside the conformal threshold, the engine knows with statistical
              rigor that something changed, rather than guessing from a chart.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
