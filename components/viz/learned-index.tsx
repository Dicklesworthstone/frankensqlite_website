"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, FastForward, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

export default function LearnedIndex() {
  const [target, setTarget] = useState<number | null>(null);
  const [step, setStep] = useState(0);

  const [keys] = useState(() =>
    Array.from({ length: 40 }, (_, i) => i * 10 + Math.floor(Math.random() * 5)),
  );

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // The "Learned Model" is basically y = mx + b.
  // We approximate the slope m and intercept b.
  const m = 40 / 400; // 40 items over range ~400
  const b = 0;

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
      description="Standard B-trees require O(log N) memory lookups to find a key. FrankenSQLite uses a machine learning model to mathematically predict the exact position of a key, reducing tree traversal to O(1) arithmetic."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative overflow-hidden">
        {/* Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Query
          </div>
          <div className="flex gap-2">
            {[150, 270, 320].map((k) => (
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
                  <Search className="w-4 h-4" /> Standard B-Tree: Traversing root to leaf (O(log N)
                  memory jumps)
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
                  <Brain className="w-4 h-4 animate-pulse" /> Learned Index: Computing pos = Key *{" "}
                  {m.toFixed(3)} + {b}
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
                  <FastForward className="w-4 h-4" /> Learned Index: Local scan around predicted pos
                </motion.span>
              )}
              {step === 4 && (
                <motion.span
                  key="4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-emerald-400 font-bold"
                >
                  Found Key {target}!
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* The Data Array */}
          <div className="flex-1 border border-white/5 bg-white/[0.02] rounded-xl p-4 flex flex-wrap gap-[1px] content-start relative overflow-hidden">
            {/* Predicted Boundary Highlights */}
            {step >= 2 && target && (
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
              const predictedIdx = target ? Math.round(target * m + b) : -1;
              const errorBound = 2; // Look at prediction +/- 2

              let stateClass = "bg-white/5 border-white/10 text-slate-600";

              if (step === 1 && target) {
                // Simulate B-Tree jump
                if (i === 19 || i === 9 || i === 29 || i === 14 || i === 24)
                  stateClass = "bg-amber-500/20 border-amber-500/50 text-amber-400";
              } else if (step === 2 && target) {
                // Highlight predicted area
                if (Math.abs(i - predictedIdx) <= errorBound)
                  stateClass =
                    "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] z-10 scale-110";
              } else if (step === 3 && target) {
                // Scan
                if (Math.abs(i - predictedIdx) <= errorBound) {
                  if (k <= target) stateClass = "bg-teal-500/20 border-teal-500/50 text-teal-300";
                  else
                    stateClass = "bg-purple-500/10 border-purple-500/20 text-purple-400 opacity-50";
                }
              } else if (step === 4 && target) {
                // Found
                const isClosest = Math.abs(k - target) <= 5; // Simulating finding it
                if (isClosest)
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
              You are looking at an ordered array of database records. Normally, a database uses a{" "}
              <FrankenJargon term="btree">B-Tree</FrankenJargon> to find a specific key, which
              requires multiple jumps through memory (root node → internal nodes → leaf node).
            </div>
            <div>
              A <FrankenJargon term="learned-index">Learned Index</FrankenJargon> replaces the tree
              with a mathematical model. It learns the distribution of the data so it can calculate
              the position directly.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Find Key 270</strong>. The visualization will first show what a standard
              B-Tree does: jumping around memory (the amber squares) doing a binary search.
            </p>
            <p>
              Then, it shows what the Learned Index does: it treats the data like a line on a graph.
              It multiplies the key (270) by a mathematically pre-calculated slope, and instantly
              predicts the exact physical location on disk (the purple glow).
            </p>
            <p>
              Because the model isn&apos;t perfect, it then does a very fast, localized linear scan
              (the teal squares) to find the exact target.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Traversing a large <FrankenJargon term="btree">B-tree</FrankenJargon> requires O(log
              N) random memory accesses. On modern hardware, random reads are orders of magnitude
              slower than sequential scans.
            </div>
            <div>
              By replacing tree pointers with simple floating-point math, a{" "}
              <FrankenJargon term="learned-index">Learned Index</FrankenJargon> transforms expensive
              random I/O into O(1) arithmetic followed by a cache-friendly sequential scan. It
              reduces the memory footprint of the index and accelerates read performance on large
              datasets.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
