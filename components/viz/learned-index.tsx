"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, FastForward, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// 40 sorted keys with deterministic jitter (sorted, roughly evenly spaced).
const KEYS = Array.from({ length: 40 }, (_, i) => i * 10 + ((i * 7) % 10));
// Keys to query; two of them land one slot away from the model's prediction.
const QUERY_KEYS = [KEYS[15], KEYS[27], KEYS[32]];
// Search window around the prediction. Illustrative; the engine's default max_error is 16.
const ERROR_BOUND = 2;

export default function LearnedIndex() {
  const [target, setTarget] = useState<number | null>(null);
  const [step, setStep] = useState(0);

  const keys = KEYS;

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // A single linear segment, pos = m * key + b, fitted to this key range.
  // The engine fits several such segments (piecewise linear) to real key distributions.
  const m = 40 / 400; // 40 items over range ~400
  const b = 0;
  const foundIdx = target === null ? -1 : keys.indexOf(target);

  const handleSearch = (key: number) => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setTarget(key);
    setStep(1); // Step 1: B-Tree

    timeoutsRef.current.push(setTimeout(() => setStep(2), 1500)); // Step 2: Model Prediction
    timeoutsRef.current.push(setTimeout(() => setStep(3), 3000)); // Step 3: Local Scan
    timeoutsRef.current.push(setTimeout(() => setStep(4), 4500)); // Step 4: Done
  };

  const reset = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setTarget(null);
    setStep(0);
  };

  return (
    <VizContainer
      title="Learned Indexes"
      description="A learned index fits a simple model to sorted keys so it can guess where a key sits, then checks a small window around the guess. FrankenSQLite has one as research code in fsqlite-btree; queries do not use it yet."
      minHeight={450}
      status="dormant"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative overflow-hidden">
        {/* Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Query
          </div>
          <div className="flex gap-2">
            {QUERY_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => handleSearch(k)}
                className="px-4 py-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-bold transition-colors"
              >
                Find Key {k}
              </button>
            ))}
            <button
              onClick={reset}
              className="px-4 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold transition-colors ml-4"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Viz Area */}
        <div className="flex-1 flex flex-col gap-6 relative">
          {/* Status Indicator */}
          <div className="h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center font-mono text-[10px] md:text-xs px-4">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.span
                  key="0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-slate-500"
                >
                  Waiting for query...
                </motion.span>
              )}
              {step === 1 && (
                <motion.span
                  key="1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-amber-400 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" /> B-tree: descend root to leaf, then binary search
                  the leaf (O(log N) comparisons)
                </motion.span>
              )}
              {step === 2 && (
                <motion.span
                  key="2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-purple-400 flex items-center gap-2"
                >
                  <Brain className="w-4 h-4 animate-pulse" /> Learned index: pos ≈ key ×{" "}
                  {m.toFixed(3)} + {b} = {target === null ? "?" : Math.round(target * m + b)}
                </motion.span>
              )}
              {step === 3 && (
                <motion.span
                  key="3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-teal-400 flex items-center gap-2"
                >
                  <FastForward className="w-4 h-4" /> Learned index: scan ±{ERROR_BOUND} slots
                  around the prediction
                </motion.span>
              )}
              {step === 4 && (
                <motion.span
                  key="4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-emerald-400 font-bold"
                >
                  Found key {target} at slot {foundIdx} (prediction was off by{" "}
                  {target === null ? 0 : Math.abs(Math.round(target * m + b) - foundIdx)})
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* The Data Array */}
          <div className="flex-1 border border-white/5 bg-white/[0.02] rounded-xl p-4 flex flex-wrap gap-[1px] content-start relative overflow-hidden">
            {/* Predicted Boundary Highlights */}
            {step >= 2 && target !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 2 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.15)_0%,transparent_70%)] pointer-events-none"
                style={{
                  left: `${((target * m) / 40) * 100 - 50}%`,
                }}
              />
            )}

            {keys.map((k, i) => {
              const predictedIdx = target !== null ? Math.round(target * m + b) : -1;
              const probes = target !== null ? binarySearchProbes(keys, target) : [];

              let stateClass = "bg-white/5 border-white/10 text-slate-600";

              if (step === 1 && target !== null) {
                // Comparisons a binary search makes on the way to the key
                if (probes.includes(i))
                  stateClass = "bg-amber-500/20 border-amber-500/50 text-amber-400";
              } else if (step === 2 && target !== null) {
                // Highlight the window around the prediction
                if (Math.abs(i - predictedIdx) <= ERROR_BOUND)
                  stateClass =
                    "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] z-10 scale-110";
              } else if (step === 3 && target !== null) {
                // Linear scan from the low edge of the window up to the key
                if (Math.abs(i - predictedIdx) <= ERROR_BOUND) {
                  if (i <= foundIdx) stateClass = "bg-teal-500/20 border-teal-500/50 text-teal-300";
                  else
                    stateClass = "bg-purple-500/10 border-purple-500/20 text-purple-400 opacity-50";
                }
              } else if (step === 4 && target !== null) {
                if (i === foundIdx)
                  stateClass =
                    "bg-emerald-500 text-black font-black shadow-[0_0_20px_rgba(16,185,129,0.8)] z-20 scale-125";
              }

              return (
                <div
                  key={i}
                  className={`w-8 h-8 md:w-10 md:h-10 border rounded flex items-center justify-center text-[8px] md:text-[10px] font-mono transition-all duration-300 ${stateClass}`}
                >
                  {k}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at 40 sorted keys. To find one, a database normally walks a{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> from the root to a leaf and then
              binary-searches inside that leaf.
            </div>
            <div>
              A <FrankenJargon term="learned-index">learned index</FrankenJargon> (Kraska et al.,
              2018) instead fits a line to the keys, uses it to guess a position, and scans a small
              window around the guess. The window size is the model&apos;s maximum error, fixed when
              the index is built.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Find Key {QUERY_KEYS[1]}</strong>. The amber squares are the keys a
              binary search compares against on its way to the target.
            </p>
            <p>
              Next the model computes a position from the key with one multiply and one add (the
              purple window). The keys are not perfectly evenly spaced, so the guess can land a
              slot away from the real position.
            </p>
            <p>
              Finally it scans the window from the left (teal) until it reaches the key. Try all
              three buttons: two land one slot away from the prediction, one lands exactly on it.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              It is a trade, not a free win. A{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> handles inserts and any key
              distribution. A{" "}
              <FrankenJargon term="learned-index">learned index</FrankenJargon> can be smaller and
              need fewer comparisons on static, smoothly distributed keys, but it has to be rebuilt
              when the data changes, and skewed keys need more segments.
            </div>
            <div>
              Where it stands: <code>fsqlite-btree</code> contains a piecewise-linear{" "}
              <code>LearnedIndex</code> over sorted <code>u64</code> keys (lookup is a binary search
              over segments, then a scan of up to ±16 slots by default) and a{" "}
              <code>LearnedRowIdIndex</code> experiment. Both are tested, but no query path calls
              them. Lookups go through the normal B-tree, which for a million rows on 4 KB pages is
              typically three or four levels deep.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}

/** Indexes a binary search compares against while looking for `target`. */
function binarySearchProbes(sorted: number[], target: number): number[] {
  const probes: number[] = [];
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes.push(mid);
    if (sorted[mid] === target) break;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return probes;
}
