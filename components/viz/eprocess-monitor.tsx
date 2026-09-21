"use client";

import { motion } from "framer-motion";
import { Activity, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface DataPoint {
  id: number;
  val: number;
  violation: boolean;
}

export default function EprocessMonitor() {
  const { playSfx } = useSite();
  const [data, setData] = useState<DataPoint[]>([]);
  const [eValue, setEValue] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const tickRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const lambda = 0.5; // bet size
  const p0 = 0.001; // expected failure rate under H0
  const threshold = 20; // 1/alpha (alpha = 0.05)

  useEffect(() => {
    if (!isSimulating || hasFailed) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      tickRef.current += 1;

      // Simulate an invariant check
      // We will force a cluster of violations to show the exponential explosion
      const isViolation = tickRef.current > 40 && Math.random() > 0.6;

      setEValue((prevE) => {
        let newE = prevE;
        if (isViolation) {
          // Under H1 (violation): E grows exponentially
          newE = prevE * (1 + (lambda * (1 - p0)) / p0);
        } else {
          // Under H0 (normal): E drifts slightly down or stays flat
          newE = prevE * (1 - lambda);
        }

        // Floor it at a tiny value so the chart doesn't look completely dead
        newE = Math.max(0.1, newE);

        if (newE >= threshold) {
          setHasFailed(true);
          setIsSimulating(false);
        }
        return newE;
      });

      setData((prev) =>
        [
          ...prev,
          {
            id: tickRef.current,
            val: isViolation ? 1 : 0,
            violation: isViolation,
          },
        ].slice(-50),
      ); // Keep last 50
    }, 150);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, hasFailed]);

  const reset = () => {
    setEValue(1);
    setData([]);
    setHasFailed(false);
    setIsSimulating(false);
    tickRef.current = 0;
  };

  return (
    <VizContainer
      title="Anytime-Valid E-Processes"
      description="Database engines run continuously, so traditional fixed-sample statistics don't work for catching rare bugs. FrankenSQLite monitors its MVCC invariants in real-time using mathematical martingales. If a subtle concurrency bug occurs, the E-Process value explodes exponentially, triggering a statistically rigorous alert instantly."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 relative justify-between">
        {/* Header Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <button
            onClick={() => {
              playSfx("click");
              if (hasFailed) {
                reset();
              } else {
                setIsSimulating(!isSimulating);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none ${
              hasFailed
                ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                : isSimulating
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                  : "bg-teal-500 text-black border border-teal-400 hover:bg-teal-400"
            }`}
          >
            <Activity className="w-4 h-4" />
            {hasFailed
              ? "Reset Monitor"
              : isSimulating
                ? "Pause Simulator"
                : "Run E-Process Monitor"}
          </button>

          <div className="flex gap-4 font-mono text-[10px] text-slate-500">
            <div className="flex flex-col items-end">
              <span>E_0 = 1</span>
              <span>p_0 = 0.001</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-purple-400">Threshold (1/α) = 20</span>
              <span className={eValue >= threshold ? "text-red-400 font-bold" : "text-white"}>
                Current E_t = {eValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 relative border-l border-b border-white/10 mx-4 mb-4">
          {/* Y-axis Labels */}
          <div className="absolute -left-8 top-0 text-[8px] text-slate-500 font-mono">25</div>
          <div className="absolute -left-8 bottom-0 text-[8px] text-slate-500 font-mono">0</div>

          {/* Rejection Threshold Line */}
          <motion.div
            className="absolute left-0 right-0 border-t-2 border-dashed border-red-500/80 z-0 flex items-center"
            style={{ bottom: `${(threshold / 25) * 100}%` }}
          >
            <span className="absolute -top-5 right-2 text-[10px] font-bold text-red-400 bg-black/80 px-2 py-0.5 rounded backdrop-blur">
              1/α (Reject H0)
            </span>
          </motion.div>

          {/* Animated E-Value Fill */}
          <div className="absolute left-0 right-0 bottom-0 top-0 overflow-hidden flex items-end">
            <motion.div
              className={`w-full bg-gradient-to-t ${hasFailed ? "from-red-500/20 to-red-500/60 border-t-2 border-red-400" : "from-teal-500/10 to-teal-500/40 border-t-2 border-teal-400"} shadow-[0_-5px_15px_rgba(20,184,166,0.2)]`}
              animate={{ height: `${Math.min((eValue / 25) * 100, 100)}%` }}
              transition={{ type: "spring", bounce: 0, duration: 0.2 }}
            />
          </div>

          {/* Operation Event Ticks on X-Axis */}
          <div className="absolute bottom-0 left-0 right-0 h-4 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={`${d.id}-${i}`}
                className={`flex-1 h-full rounded-t-sm ${d.violation ? "bg-red-500" : "bg-slate-700/50"}`}
              />
            ))}
          </div>
        </div>

        {/* Narrative Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                Under H_0 (System is Healthy)
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed font-mono">
                E[E_t | F_{"{t-1}"}] ≤ E_{"{t-1}"}
                <br />
                The <FrankenJargon term="e-process">e-process</FrankenJargon> behaves as a
                supermartingale. It drifts downwards or stays near 1. Millions of operations can
                pass without triggering a false alarm.
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                Under H_1 (Bug Detected)
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                P_{"{H_0}"}(∃t : E_t ≥ 1/α) ≤ α<br />
                When actual violations occur, the mathematical bet wins, and the value explodes
                exponentially via Ville&apos;s inequality, stopping the system immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a live data stream of an{" "}
              <FrankenJargon term="e-process">E-Process Monitor</FrankenJargon>. It is a statistical
              engine continuously evaluating the health of the database&apos;s internal memory
              invariants.
            </div>
            <p>
              The small bars at the bottom represent individual transactions (green = normal, red =
              violation). The glowing fill area represents the mathematical &ldquo;E-Value&rdquo;,
              which starts at 1 and grows or shrinks in response to observed events. The dashed red
              line near the top is the rejection threshold.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Run E-Process Monitor</strong>. Under normal operation (H_0), the system
              is healthy. Because the E-Process is mathematically a supermartingale, the E-Value
              drifts downwards or stays flat near 1, even after millions of operations.
            </p>
            <p>
              Suddenly, a cluster of red anomalies (simulating a rare concurrency bug) will trigger.
              Watch what happens to the E-Value: it explodes exponentially. It instantly crosses the{" "}
              <code>1/α</code> threshold, triggering a mathematically rigorous alert.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Fixed-sample unit tests cannot catch concurrency bugs that manifest only under
              specific timing conditions, sometimes once in ten million operations. Traditional
              statistical tests also require a predetermined sample size, which is impossible for a
              continuously running server.
            </div>
            <div>
              <FrankenJargon term="e-process">E-Processes</FrankenJargon> provide anytime-valid
              confidence intervals. By monitoring{" "}
              <FrankenJargon term="snapshot-isolation">snapshot isolation</FrankenJargon> invariants
              constantly in production, FrankenSQLite can prove the safety of its{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> engine, catching rare bugs in
              milliseconds without generating false positives.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
