"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MousePointerClick, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

const CAPACITY = 6; // Small capacity for visualization

export default function ArcEviction() {
  const [t1, setT1] = useState<number[]>([]);
  const [t2, setT2] = useState<number[]>([]);
  const [b1, setB1] = useState<number[]>([]);
  const [b2, setB2] = useState<number[]>([]);
  const [p, setP] = useState(0);

  const requestPage = (x: number) => {
    let newT1 = [...t1];
    let newT2 = [...t2];
    let newB1 = [...b1];
    let newB2 = [...b2];
    let newP = p;

    // Helper: replace
    const replace = (reqX: number, currentP: number) => {
      if (
        newT1.length > 0 &&
        (newT1.length > currentP || (newB2.includes(reqX) && newT1.length === currentP))
      ) {
        // Move LRU of T1 to MRU of B1
        const lru = newT1[0];
        newT1 = newT1.slice(1);
        newB1.push(lru);
      } else if (newT2.length > 0) {
        // Move LRU of T2 to MRU of B2
        const lru = newT2[0];
        newT2 = newT2.slice(1);
        newB2.push(lru);
      }
    };

    if (newT1.includes(x) || newT2.includes(x)) {
      // Case 1: Hit in cache
      if (newT1.includes(x)) newT1 = newT1.filter((v) => v !== x);
      if (newT2.includes(x)) newT2 = newT2.filter((v) => v !== x);
      newT2.push(x);
    } else if (newB1.includes(x)) {
      // Case 2: Hit in B1 (Ghost Recent)
      const delta = newB1.length >= newB2.length ? 1 : Math.floor(newB2.length / newB1.length);
      newP = Math.min(CAPACITY, newP + delta);
      replace(x, newP);
      newB1 = newB1.filter((v) => v !== x);
      newT2.push(x);
    } else if (newB2.includes(x)) {
      // Case 3: Hit in B2 (Ghost Frequent)
      const delta = newB2.length >= newB1.length ? 1 : Math.floor(newB1.length / newB2.length);
      newP = Math.max(0, newP - delta);
      replace(x, newP);
      newB2 = newB2.filter((v) => v !== x);
      newT2.push(x);
    } else {
      // Case 4: Cache Miss
      if (newT1.length + newB1.length === CAPACITY) {
        if (newT1.length < CAPACITY) {
          newB1 = newB1.slice(1); // Delete LRU of B1
          replace(x, newP);
        } else {
          newT1 = newT1.slice(1); // Delete LRU of T1
        }
      } else if (newT1.length + newB1.length < CAPACITY) {
        const totalLen = newT1.length + newT2.length + newB1.length + newB2.length;
        if (totalLen >= CAPACITY) {
          if (totalLen === CAPACITY * 2 && newB2.length > 0) {
            newB2 = newB2.slice(1); // Delete LRU of B2
          }
          replace(x, newP);
        }
      }
      newT1.push(x);
    }

    setT1(newT1);
    setT2(newT2);
    setB1(newB1);
    setB2(newB2);
    setP(newP);
  };

  const reset = () => {
    setT1([]);
    setT2([]);
    setB1([]);
    setB2([]);
    setP(0);
  };

  const pages = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <VizContainer
      title="Adaptive Replacement Cache (ARC)"
      description="LRU caching fails when large table scans evict your working set. FrankenSQLite uses ARC, which auto-tunes itself between Recency (T1) and Frequency (T2) based on ghost hits (B1, B2)."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 relative justify-between">
        {/* Controls */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Request Pages
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap max-w-[200px] justify-end">
            {pages.map((pg) => (
              <button
                key={pg}
                onClick={() => requestPage(pg)}
                className="w-8 h-8 rounded border border-white/10 bg-white/5 hover:bg-teal-500 hover:text-black hover:border-teal-400 text-xs font-bold transition-all"
              >
                {pg}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic P visualizer */}
        <div className="w-full h-8 rounded-lg border border-white/10 bg-black/40 overflow-hidden relative flex items-center px-4">
          <div
            className="absolute top-0 bottom-0 left-0 bg-teal-500/10 transition-all duration-300"
            style={{ width: `${(p / CAPACITY) * 100}%` }}
          />
          <div className="absolute left-4 z-10 text-[10px] font-mono text-teal-400">
            Recency Bias (p) = {p}
          </div>
          <div className="absolute right-4 z-10 text-[10px] font-mono text-amber-400">
            Frequency Bias (c-p) = {CAPACITY - p}
          </div>
        </div>

        {/* Cache Lists */}
        <div className="grid grid-cols-2 gap-4 flex-1 mt-2">
          {/* Recency Column */}
          <div className="flex flex-col gap-4">
            {/* T1 */}
            <ListBlock
              title="T1 (Recent Cache)"
              desc="Hits move to T2"
              color="border-teal-500/50 bg-teal-500/10 text-teal-300"
              items={t1}
            />
            {/* B1 */}
            <ListBlock
              title="B1 (Recent Ghost)"
              desc="Metadata only. Hit increases 'p'."
              color="border-teal-500/20 bg-black text-slate-500 border-dashed"
              items={b1}
            />
          </div>

          {/* Frequency Column */}
          <div className="flex flex-col gap-4">
            {/* T2 */}
            <ListBlock
              title="T2 (Frequent Cache)"
              desc="Hits stay in T2"
              color="border-amber-500/50 bg-amber-500/10 text-amber-300"
              items={t2}
            />
            {/* B2 */}
            <ListBlock
              title="B2 (Frequent Ghost)"
              desc="Metadata only. Hit decreases 'p'."
              color="border-amber-500/20 bg-black text-slate-500 border-dashed"
              items={b2}
            />
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-white/10 pt-4">
          <div className="text-xs text-slate-500 max-w-[280px]">
            Notice how accessing a ghost item (B1 or B2) shifts the <b>p</b> boundary, adapting the
            cache on the fly.
          </div>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold transition-all flex items-center gap-2"
          >
            <RefreshCcw className="w-3 h-3" /> Reset Cache
          </button>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a live simulation of the{" "}
              <FrankenJargon term="arc-cache">Adaptive Replacement Cache (ARC)</FrankenJargon>.
              Standard databases use an LRU (Least Recently Used) list to decide what{" "}
              <FrankenJargon term="btree">B-tree pages</FrankenJargon> to keep in RAM. ARC is more
              adaptive: it uses four distinct lists.
            </div>
            <p>
              T1 stores &ldquo;Recent&rdquo; items. T2 stores &ldquo;Frequent&rdquo; items. B1 and
              B2 are &ldquo;Ghost&rdquo; lists; they don&apos;t actually store data, they just
              remember the metadata of things that were recently evicted.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click on several different pages to fill up the T1 (Recent) cache. Once it is full,
              notice how the oldest item drops down into the B1 (Ghost) list.
            </p>
            <p>
              Now, request a page that is sitting in the B1 Ghost list. Watch the slider in the
              middle! Because you requested something the cache recently threw away, ARC
              mathematically shifts the <code>p</code> boundary to favor recency, shrinking the
              frequency side to compensate.
            </p>
            <p>
              Request the same page multiple times to see it graduate into the T2 (Frequent) cache.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              A classic database failure mode is a user running a <code>SELECT *</code> across a
              large table. In an LRU system, this single sequential scan evicts the hot indexes and{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> pages your production application
              depends on, causing a sudden spike in disk I/O for subsequent queries.
            </p>
            <p>
              Because <FrankenJargon term="arc-cache">ARC</FrankenJargon> dynamically balances
              recency against frequency, a full table scan fills T1 and eventually flows into B1,
              leaving frequently accessed hot data safely in T2. Combined with the{" "}
              <FrankenJargon term="cooling-protocol">cooling protocol</FrankenJargon> and{" "}
              <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> for in-memory
              page references, this substantially reduces cache thrashing without requiring manual
              memory partition tuning.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}

function ListBlock({
  title,
  desc,
  color,
  items,
}: {
  title: string;
  desc: string;
  color: string;
  items: number[];
}) {
  return (
    <div className={`flex-1 rounded-xl border p-3 flex flex-col ${color}`}>
      <div className="flex justify-between items-start mb-2 border-b border-current pb-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest">{title}</div>
          <div className="text-[9px] opacity-70 mt-0.5">{desc}</div>
        </div>
        <div className="text-[10px] font-mono opacity-80">{items.length}</div>
      </div>

      <div className="flex flex-wrap gap-1 mt-auto items-end">
        <AnimatePresence>
          {items.map((val) => (
            <motion.div
              key={val}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-xs font-mono font-bold"
            >
              {val}
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="text-[10px] italic opacity-50 w-full text-center py-2">Empty</div>
        )}
      </div>
    </div>
  );
}
