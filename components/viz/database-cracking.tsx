"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, SplitSquareHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

export default function DatabaseCracking() {
  const [data, setData] = useState<number[]>([
    45, 12, 89, 33, 76, 21, 98, 54, 8, 67, 34, 91, 19, 56, 82, 41, 15, 73, 28, 62,
  ]);
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState<{ op: string; val: number } | null>(null);
  const [partitions, setPartitions] = useState<number[]>([]); // indexes of partition boundaries

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const queries = [
    { op: "<", val: 50, label: "Q1: WHERE val < 50" },
    { op: ">", val: 75, label: "Q2: WHERE val > 75" },
    { op: "<", val: 25, label: "Q3: WHERE val < 25" },
  ];

  const handleQuery = (idx: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (idx === 0) {
      setQuery(queries[0]);
      setStep(1);
      timeoutRef.current = setTimeout(() => {
        // Partition around 50
        const left = data.filter((x) => x < 50);
        const right = data.filter((x) => x >= 50);
        setData([...left, ...right]);
        setPartitions([left.length]);
        setStep(2);
      }, 1500);
    } else if (idx === 1) {
      setQuery(queries[1]);
      setStep(1);
      timeoutRef.current = setTimeout(() => {
        // Keep <50 partition, partition the >=50 side around 75
        const p1 = partitions[0];
        const p1Data = data.slice(0, p1);
        const rest = data.slice(p1);

        const mid = rest.filter((x) => x <= 75);
        const right = rest.filter((x) => x > 75);

        setData([...p1Data, ...mid, ...right]);
        setPartitions([p1, p1 + mid.length]);
        setStep(2);
      }, 1500);
    } else if (idx === 2) {
      setQuery(queries[2]);
      setStep(1);
      timeoutRef.current = setTimeout(() => {
        // Partition the <50 side around 25
        const p1 = partitions[0];
        const p2 = partitions[1];

        const first = data.slice(0, p1);
        const left = first.filter((x) => x < 25);
        const mid1 = first.filter((x) => x >= 25);

        const rest = data.slice(p1);

        setData([...left, ...mid1, ...rest]);
        setPartitions([
          left.length,
          left.length + mid1.length,
          p2 + left.length + mid1.length - p1,
        ]);
        setStep(2);
      }, 1500);
    }
  };

  const reset = () => {
    setData([45, 12, 89, 33, 76, 21, 98, 54, 8, 67, 34, 91, 19, 56, 82, 41, 15, 73, 28, 62]);
    setStep(0);
    setQuery(null);
    setPartitions([]);
  };

  return (
    <VizContainer
      title="Database Cracking"
      description="Database cracking (Idreos et al., 2007) partitions a column a little more on every range query, so the ranges people actually ask for get cheaper to scan without an upfront index build. FrankenSQLite has a cracked-column implementation in fsqlite-btree; the query engine does not use it."
      minHeight={400}
      status="dormant"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative">
        {/* Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <div className="flex gap-2">
            {queries.map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuery(i)}
                disabled={step === 1 || (i > 0 && partitions.length < i)}
                className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                  step === 1
                    ? "bg-white/5 text-slate-600 cursor-not-allowed"
                    : (i > 0 && partitions.length < i)
                      ? "bg-white/5 text-slate-600 cursor-not-allowed"
                      : "bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <button
            onClick={reset}
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Status Indicator */}
        <div className="h-10 flex items-center justify-center font-mono text-[10px] md:text-xs text-slate-400">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.span
                key="0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Unsorted Column Data. Waiting for first query...
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
                <Search className="w-4 h-4 animate-pulse" /> Scanning & Partitioning around{" "}
                {query?.val}...
              </motion.span>
            )}
            {step === 2 && (
              <motion.span
                key="2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-emerald-400 flex items-center gap-2"
              >
                <SplitSquareHorizontal className="w-4 h-4" /> Column partitioned in place. Later
                queries in these ranges scan a smaller piece.
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Data Array Visualization */}
        <div className="flex-1 relative flex items-center justify-center">
          <div className="flex flex-wrap gap-1 justify-center max-w-[500px]">
            <AnimatePresence mode="popLayout">
              {data.map((val, i) => {
                const isTarget =
                  step === 1 && query && (query.op === "<" ? val < query.val : val > query.val);
                const isBoundary = partitions.includes(i);

                return (
                  <div key={val} className="flex items-center">
                    {isBoundary && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 40, opacity: 1 }}
                        className="w-1 bg-teal-500 mx-1 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.8)]"
                      />
                    )}
                    <motion.div
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        backgroundColor: isTarget
                          ? "rgba(245, 158, 11, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                        borderColor: isTarget
                          ? "rgba(245, 158, 11, 0.5)"
                          : "rgba(255, 255, 255, 0.1)",
                        color: isTarget ? "#fbbf24" : "#94a3b8",
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-lg border flex items-center justify-center font-mono text-xs md:text-sm font-bold"
                    >
                      {val}
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at an unsorted copy of one column&apos;s values.
            </p>
            <div>
              The usual way to speed up <code>WHERE</code> queries on a column is{" "}
              <code>CREATE INDEX</code>: one full pass to build a{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> up front, extra storage, and extra
              work on every later write. You also have to guess which columns deserve it.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Q1: WHERE val &lt; 50</strong>. While answering the query, the column
              is partitioned in place: values below 50 move left, the rest move right, and a
              &ldquo;crack&rdquo; (the teal line) records where the split is.
            </p>
            <p>
              Now click <strong>Q2</strong> and then <strong>Q3</strong>. Each query only
              partitions the piece its bounds fall in, so the pieces get smaller in the ranges you
              query and stay coarse elsewhere.
            </p>
            <p>
              Repeat this many times and the column approaches sorted order. It never becomes a
              B-tree: it is a partially sorted array plus a small map of crack positions.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              <FrankenJargon term="database-cracking">Cracking</FrankenJargon> moves indexing cost
              from an upfront build into the first queries that touch a range, and spends nothing
              on columns nobody queries. The trade-offs: early queries do extra partitioning work,
              the reordered copy has to be kept consistent with updates, and concurrent queries
              that crack the same column need coordination.
            </div>
            <div>
              Where it stands: <code>CrackedColumn</code> in{" "}
              <code>fsqlite-btree/src/cracking.rs</code> implements this over an in-memory column and
              is covered by tests, but no query path calls it. The planner also has a small
              &ldquo;cracking hint&rdquo; cache that remembers the last index chosen per table; the
              connection does not pass one in, so it is unused as well. Tables and indexes are
              ordinary SQLite B-trees.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
