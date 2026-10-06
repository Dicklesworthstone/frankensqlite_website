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

  // Betting e-process from the design docs: E_t = E_{t-1} * (1 + lambda * (X_t - p0)),
  // with X_t = 1 when the monitored event happens. Parameters match the documented config.
  const lambda = 0.5; // bet size
  const p0 = 0.001; // null hypothesis: events occur at most 0.1% of the time
  const threshold = 20; // 1/alpha (alpha = 0.05)

  useEffect(() => {
    if (!isSimulating || hasFailed) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      tickRef.current += 1;

      // Clean stream for the first 40 observations, then events at a 40% rate,
      // far above the 0.1% the null hypothesis allows.
      const isViolation = tickRef.current > 40 && Math.random() < 0.4;

      setEValue((prevE) => {
        const x = isViolation ? 1 : 0;
        const newE = prevE * (1 + lambda * (x - p0));

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
      description="An e-process is a running bet against a null hypothesis such as 'this event happens at most 0.1% of the time'. You can check it after every observation and still keep the false-alarm rate below α. FrankenSQLite uses e-processes in a few narrow places: a per-connection load-shedding signal, an opt-in experimental commit gate, and test-harness monitors."
      minHeight={450}
      status="partial"
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
                ? "Pause Simulation"
                : "Run E-Process Monitor"}
          </button>

          <div className="flex gap-4 font-mono text-[10px] text-slate-500">
            <div className="flex flex-col items-end">
              <span>E_0 = 1, λ = 0.5</span>
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
                Under H_0 (event rate ≤ p_0)
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed font-mono">
                E[E_t | F_{"{t-1}"}] ≤ E_{"{t-1}"}
                <br />
                The <FrankenJargon term="e-process">e-process</FrankenJargon> is a
                supermartingale: on average it does not grow. Each clean observation shrinks it
                slightly (×0.9995 here).
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                Events Arrive Too Often
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                P_{"{H_0}"}(∃t : E_t ≥ 1/α) ≤ α<br />
                Each event multiplies E_t by about 1.5. Several close together carry it past 1/α
                and H_0 is rejected. By Ville&apos;s inequality a false alarm has probability at
                most α = 5%, not zero.
              </p>
            </div>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a simulated{" "}
              <FrankenJargon term="e-process">e-process</FrankenJargon> watching a stream of yes/no
              observations, for example &ldquo;was this abort a false positive?&rdquo;. The null
              hypothesis H_0 says the event happens at most 0.1% of the time.
            </div>
            <p>
              The bars along the bottom are observations (grey = no event, red = event). The filled
              area is the e-value E_t, which starts at 1. The dashed line is the rejection threshold
              1/α = 20.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Run E-Process Monitor</strong>. For the first 40 observations nothing
              happens and E_t edges down from 1.
            </p>
            <p>
              Then events start arriving at about 40%, far above what H_0 allows. Each one raises
              E_t by roughly half, and after several of them it crosses 20 and the monitor rejects
              H_0. Reset and run it again: the crossing time varies with the random stream.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              A classical test fixes its sample size in advance; peeking after every observation
              inflates the false-alarm rate. An{" "}
              <FrankenJargon term="e-process">e-process</FrankenJargon> can be checked continuously
              and still keeps false alarms below α, provided the null model is valid. It is
              evidence about a rate, not a proof that the system is correct.
            </div>
            <div>
              Where FrankenSQLite uses them: each connection keeps a small e-process, updated every
              64 statements from the write-conflict abort rate, page-cache miss ratio and cache
              pressure. When it crosses its threshold it can cancel work explicitly given a
              priority above 1; ordinary statements run at priority 0, so by default it only
              records. An experimental mode (<code>PRAGMA fsqlite.write_merge = LAB_UNSAFE</code>,
              off by default) uses an e-process to decide when to skip{" "}
              <FrankenJargon term="ssi">SSI</FrankenJargon> validation. The test harness uses
              e-processes for the SSI false-positive abort rate and conformance drift; there, hard{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> invariant violations, such as two
              transactions holding the same page lock, count as immediate failures instead of being
              left to statistics.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
