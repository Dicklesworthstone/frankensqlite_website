"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, RefreshCcw, ThermometerSnowflake, ThermometerSun } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface Page {
  id: number;
  state: "hot" | "cooling" | "cold";
  value: string;
}

export default function CoolingProtocol() {
  const [pages, setPages] = useState<Page[]>([
    { id: 1, state: "hot", value: "Root P1" },
    { id: 2, state: "hot", value: "Users P2" },
    { id: 3, state: "hot", value: "Users P3" },
    { id: 4, state: "cooling", value: "Logs P4" },
    { id: 5, state: "cooling", value: "Logs P5" },
    { id: 6, state: "cold", value: "Archive P6" },
  ]);

  const touchPage = (id: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, state: "hot" };
        }
        return p;
      }),
    );
  };

  const runBackgroundScan = () => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === 1) return p; // Root page pinned hot
        if (p.state === "hot") return { ...p, state: "cooling" };
        if (p.state === "cooling") return { ...p, state: "cold" };
        return p;
      }),
    );
  };

  const fetchNewPage = () => {
    const newId = Math.max(...pages.map((p) => p.id), 0) + 1;

    setPages((prev) => {
      // Find a cold page to evict
      const coldIdx = prev.findIndex((p) => p.state === "cold");
      const next = [...prev];
      if (coldIdx >= 0) {
        next.splice(coldIdx, 1);
      } else {
        // Force a scan if no cold pages (simplified for viz)
        const scanned = prev.map((p) =>
          p.id === 1
            ? p
            : p.state === "hot"
              ? { ...p, state: "cooling" as const }
              : { ...p, state: "cold" as const },
        );
        return [...scanned, { id: newId, state: "hot", value: `Data P${newId}` }];
      }

      return [...next, { id: newId, state: "hot", value: `Data P${newId}` }];
    });
  };

  const reset = () => {
    setPages([
      { id: 1, state: "hot", value: "Root P1" },
      { id: 2, state: "hot", value: "Users P2" },
      { id: 3, state: "hot", value: "Users P3" },
      { id: 4, state: "cooling", value: "Logs P4" },
      { id: 5, state: "cooling", value: "Logs P5" },
      { id: 6, state: "cold", value: "Archive P6" },
    ]);
  };

  return (
    <VizContainer
      title="The Cooling Protocol"
      description="Standard LRU cache eviction thrashes the buffer pool during sequential table scans. FrankenSQLite uses a lean HOT/COOLING/COLD state machine. Pages must survive one full 'cooling cycle' without being re-accessed before they can be evicted to disk."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6 relative">
        {/* Controls */}
        <div className="flex justify-between items-center z-10 border-b border-white/10 pb-4">
          <div className="flex gap-2">
            <button
              onClick={runBackgroundScan}
              className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-bold transition-all flex items-center gap-2"
            >
              <RefreshCcw className="w-3 h-3" />
              Run Background Scan
            </button>
            <button
              onClick={fetchNewPage}
              className="px-4 py-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-bold transition-all"
            >
              Fetch New Page (Evicts Cold)
            </button>
          </div>
          <button
            onClick={reset}
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>

        {/* States Container */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full">
          {/* HOT */}
          <div className="flex-1 rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col gap-3 relative">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <ThermometerSun className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">HOT (Pinned)</span>
            </div>
            <div className="flex flex-wrap gap-2 content-start">
              <AnimatePresence>
                {pages
                  .filter((p) => p.state === "hot")
                  .map((p) => (
                    <motion.div
                      layoutId={`page-${p.id}`}
                      key={p.id}
                      onClick={() => touchPage(p.id)}
                      className="px-3 py-2 rounded border border-red-500/50 bg-red-500/20 text-red-200 text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
                    >
                      {p.value}
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>

          {/* COOLING */}
          <div className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-3 relative">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <RefreshCcw className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                COOLING (Grace)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 content-start">
              <AnimatePresence>
                {pages
                  .filter((p) => p.state === "cooling")
                  .map((p) => (
                    <motion.div
                      layoutId={`page-${p.id}`}
                      key={p.id}
                      onClick={() => touchPage(p.id)}
                      className="px-3 py-2 rounded border border-amber-500/50 bg-amber-500/20 text-amber-200 text-xs font-bold cursor-pointer hover:scale-105 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-200 transition-all flex items-center gap-2 group"
                    >
                      {p.value}
                      <MousePointerClick className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>

          {/* COLD */}
          <div className="flex-1 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex flex-col gap-3 relative">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <ThermometerSnowflake className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                COLD (Evictable)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 content-start">
              <AnimatePresence>
                {pages
                  .filter((p) => p.state === "cold")
                  .map((p) => (
                    <motion.div
                      layoutId={`page-${p.id}`}
                      key={p.id}
                      onClick={() => touchPage(p.id)}
                      className="px-3 py-2 rounded border border-blue-500/50 bg-blue-500/20 text-blue-200 text-xs font-bold cursor-pointer hover:scale-105 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-200 transition-all flex items-center gap-2 group opacity-60"
                    >
                      {p.value}
                      <MousePointerClick className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto text-center mt-4">
          Click any page to simulate an access, moving it instantly back to the{" "}
          <strong className="text-red-400">HOT</strong> state. When memory fills up, the engine only
          evicts from the <strong className="text-blue-400">COLD</strong> pool, preventing a single
          long table scan from flushing your entire working set. Root pages are permanently pinned
          HOT.
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a simulation of FrankenSQLite&apos;s{" "}
              <FrankenJargon term="cooling-protocol">Cooling Protocol</FrankenJargon> page cache.
              Three zones represent the lifecycle of a{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> in memory:{" "}
              <strong className="text-red-400">Hot</strong> (recently accessed),{" "}
              <strong className="text-amber-400">Cooling</strong> (aging, pending eviction review),
              and <strong className="text-blue-400">Cold</strong> (eviction-eligible). This replaces
              the standard LRU eviction policy that most databases use.
            </p>
            <p>
              In a standard LRU cache, a single sequential table scan pushes every hot page out,
              forcing the engine to re-read frequently-accessed{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> interior nodes from disk. The
              Cooling Protocol prevents this by requiring pages to survive a full cooling cycle
              before eviction.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click any page badge to simulate an access, which instantly returns the page to the
              Hot zone. Click <strong>Run Background Scan</strong> to advance the cooling cycle: all
              Hot pages move to Cooling, and all Cooling pages move to Cold. Click{" "}
              <strong>Fetch New Page</strong> to see eviction in action; only the oldest Cold page
              is evicted to make room.
            </p>
            <p>
              Notice that frequently-accessed pages never reach the Cold zone because each access
              resets them to Hot. Sequential scan pages, by contrast, flow straight through to Cold
              and are evicted without displacing your working set.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Mixed workloads (OLTP point queries alongside analytical scans) are where LRU caches
              fall apart. The{" "}
              <FrankenJargon term="cooling-protocol">Cooling Protocol</FrankenJargon> keeps your hot
              indexes and interior <FrankenJargon term="btree">B-tree</FrankenJargon> nodes in
              memory during scans, eliminating the latency spikes that cause p99 regressions in
              production. Combined with{" "}
              <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> on pinned pages
              (which bypass the cache lookup entirely), the result is stable, predictable read
              latency regardless of concurrent scan activity.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
