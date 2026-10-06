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
  /** Accesses since the last cooling scan. */
  hits: number;
  /** Order in which the page entered COOLING; eviction takes the oldest first. */
  cooledAt: number;
}

/** Frames available in this toy buffer pool (HOT + COOLING pages). */
const CAPACITY = 5;
/** A HOT page with fewer accesses than this since the last scan cools (engine default: 2). */
const COOLING_THRESHOLD = 2;
const ROOT_ID = 1;

const INITIAL_PAGES: Page[] = [
  { id: 1, state: "hot", value: "Root P1", hits: 0, cooledAt: 0 },
  { id: 2, state: "hot", value: "Users P2", hits: 3, cooledAt: 0 },
  { id: 3, state: "hot", value: "Users P3", hits: 1, cooledAt: 0 },
  { id: 4, state: "cooling", value: "Logs P4", hits: 0, cooledAt: 1 },
  { id: 5, state: "cooling", value: "Logs P5", hits: 0, cooledAt: 2 },
  { id: 6, state: "cold", value: "Archive P6", hits: 0, cooledAt: 0 },
];

const resident = (pages: Page[]) => pages.filter((p) => p.state !== "cold").length;

/**
 * Make room for one more resident page by evicting the oldest COOLING page
 * (COOLING -> COLD). HOT pages and the pinned root are never evicted.
 */
function makeRoom(pages: Page[]): { pages: Page[]; evicted: Page | null; ok: boolean } {
  if (resident(pages) < CAPACITY) return { pages, evicted: null, ok: true };
  const victim = pages
    .filter((p) => p.state === "cooling" && p.id !== ROOT_ID)
    .sort((a, b) => a.cooledAt - b.cooledAt)[0];
  if (!victim) return { pages, evicted: null, ok: false };
  return {
    pages: pages.map((p) => (p.id === victim.id ? { ...p, state: "cold" as const, hits: 0 } : p)),
    evicted: victim,
    ok: true,
  };
}

export default function CoolingProtocol() {
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [message, setMessage] = useState(
    "Click a page to access it, or run a cooling scan.",
  );

  const touchPage = (id: number) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    if (page.state !== "cold") {
      // Access: count it; a COOLING page is re-heated to HOT.
      setPages(
        pages.map((p) => (p.id === id ? { ...p, state: "hot" as const, hits: p.hits + 1 } : p)),
      );
      setMessage(
        page.state === "cooling"
          ? `${page.value} was accessed while COOLING, so it is HOT again.`
          : `${page.value} accessed (${page.hits + 1} since the last scan).`,
      );
      return;
    }
    // COLD page: load it from disk, which needs a free frame.
    const room = makeRoom(pages);
    if (!room.ok) {
      setMessage("No free frame and no COOLING page to evict. Run a cooling scan first.");
      return;
    }
    setPages(
      room.pages.map((p) => (p.id === id ? { ...p, state: "hot" as const, hits: 1 } : p)),
    );
    setMessage(
      room.evicted
        ? `Evicted ${room.evicted.value} (COOLING → COLD) to load ${page.value} from disk.`
        : `Loaded ${page.value} from disk into a free frame.`,
    );
  };

  const runBackgroundScan = () => {
    let cooled = 0;
    const seq = Math.max(...pages.map((p) => p.cooledAt), 0);
    setPages(
      pages.map((p) => {
        if (p.id === ROOT_ID) return { ...p, hits: 0 }; // Root page pinned HOT
        if (p.state === "hot" && p.hits < COOLING_THRESHOLD) {
          cooled += 1;
          return { ...p, state: "cooling" as const, hits: 0, cooledAt: seq + cooled };
        }
        return { ...p, hits: 0 };
      }),
    );
    setMessage(
      `Cooling scan: ${cooled} HOT page${cooled === 1 ? "" : "s"} with fewer than ${COOLING_THRESHOLD} accesses moved to COOLING. Counters reset.`,
    );
  };

  const fetchNewPage = () => {
    const newId = Math.max(...pages.map((p) => p.id), 0) + 1;
    const room = makeRoom(pages);
    if (!room.ok) {
      setMessage("No free frame and no COOLING page to evict. Run a cooling scan first.");
      return;
    }
    const value = `Data P${newId}`;
    setPages([...room.pages, { id: newId, state: "hot", value, hits: 1, cooledAt: 0 }]);
    setMessage(
      room.evicted
        ? `Evicted ${room.evicted.value} (COOLING → COLD) to load ${value}.`
        : `Loaded ${value} into a free frame.`,
    );
  };

  const reset = () => {
    setPages(INITIAL_PAGES);
    setMessage("Click a page to access it, or run a cooling scan.");
  };

  return (
    <VizContainer
      title="The Cooling Protocol"
      description="LeanStore's HOT/COOLING/COLD scheme gives a page a grace period before eviction: a page that stops being used is first marked COOLING, and only COOLING pages can be evicted. FrankenSQLite has this state machine in fsqlite-btree, but the live page cache does not use it; S3-FIFO handles eviction today."
      minHeight={450}
      status="dormant"
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
              Run Cooling Scan
            </button>
            <button
              onClick={fetchNewPage}
              className="px-4 py-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-bold transition-all"
            >
              Fetch New Page
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
              <span className="text-[10px] font-black uppercase tracking-widest">
                HOT (in memory, not evictable)
              </span>
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
                      className="px-3 py-2 rounded border border-red-500/50 bg-red-500/20 text-red-200 text-xs font-bold cursor-pointer hover:scale-105 transition-transform flex items-center gap-2"
                    >
                      {p.value}
                      <span className="font-mono text-[9px] text-red-300/70">
                        {p.id === ROOT_ID ? "pinned" : `×${p.hits}`}
                      </span>
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
                COOLING (in memory, evictable)
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
                COLD (on disk)
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
          <div className="font-mono text-[11px] text-slate-300 mb-1" aria-live="polite">
            {message}
          </div>
          {resident(pages)} of {CAPACITY} frames in use. Only{" "}
          <strong className="text-amber-400">COOLING</strong> pages are evicted, and eviction sends
          them to <strong className="text-blue-400">COLD</strong>. The root page is pinned{" "}
          <strong className="text-red-400">HOT</strong>.
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a toy buffer pool with five frames, run by the{" "}
              <FrankenJargon term="cooling-protocol">cooling protocol</FrankenJargon> from LeanStore
              (Leis et al., 2018). Each{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> is{" "}
              <strong className="text-red-400">HOT</strong> (in memory, in use),{" "}
              <strong className="text-amber-400">COOLING</strong> (still in memory, but a candidate
              for eviction), or <strong className="text-blue-400">COLD</strong> (on disk).
            </div>
            <p>
              The numbers on HOT pages count accesses since the last cooling scan. A scan moves HOT
              pages with fewer than {COOLING_THRESHOLD} accesses to COOLING and resets the counters.
              Touching a COOLING page makes it HOT again without any disk I/O.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Run Cooling Scan</strong>. Users P3 (one access) cools; Users P2 (three
              accesses) stays HOT. Click a COOLING page to re-heat it.
            </p>
            <p>
              Click <strong>Fetch New Page</strong> a few times. The pool is full, so each fetch
              evicts the oldest COOLING page to COLD. HOT pages are never chosen. When nothing is
              COOLING, the fetch has to wait for a scan. Click a COLD page to load it back from disk.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Under plain LRU, one large table scan can push every frequently used page out of the
              cache. The cooling stage gives each page a grace period, so a page touched once by a
              scan cools at the next scan and is evicted ahead of pages that keep getting used.
              LeanStore pairs this with{" "}
              <FrankenJargon term="swizzle-pointer">pointer swizzling</FrankenJargon>, where a
              parent page holds a direct memory pointer to a resident child instead of a page
              number that has to be looked up.
            </div>
            <div>
              Where it stands: <code>CoolingStateMachine</code> and <code>SwizzlePtr</code> live in{" "}
              <code>fsqlite-btree</code> and are covered by harness tests, but the pager does not
              call them. The live page cache uses S3-FIFO eviction, which has a similar goal: keep
              one-time scan pages from displacing the working set.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
