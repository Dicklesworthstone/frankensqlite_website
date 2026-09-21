"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FastForward, Hash, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

const HASHTABLE_NSLOT = 16; // scaled down for viz
const MULTIPLIER = 3; // scaled down prime
const EMPTY = 0;

interface HashSlot {
  page_number: number;
  frame_offset: number;
}

export default function WalIndexShm() {
  const [slots, setSlots] = useState<HashSlot[]>(
    Array(HASHTABLE_NSLOT).fill({ page_number: EMPTY, frame_offset: 0 }),
  );
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [searchPath, setSearchPath] = useState<number[]>([]);
  const [foundSlot, setFoundSlot] = useState<number | null>(null);

  // Initialize some data
  useEffect(() => {
    const initialPages = [42, 12, 99, 7];
    const newSlots = Array(HASHTABLE_NSLOT).fill({ page_number: EMPTY, frame_offset: 0 });

    initialPages.forEach((pg, i) => {
      let slot = (pg * MULTIPLIER) % HASHTABLE_NSLOT;
      while (newSlots[slot].page_number !== EMPTY) {
        slot = (slot + 1) % HASHTABLE_NSLOT;
      }
      newSlots[slot] = { page_number: pg, frame_offset: 1000 + i };
    });

    setSlots(newSlots);
  }, []);

  useEffect(() => {
    return () => {
      if (activeIntervalRef.current) {
        clearInterval(activeIntervalRef.current);
      }
    };
  }, []);

  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const searchPage = (pg: number) => {
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
    }
    setTargetPage(pg);
    setSearchPath([]);
    setFoundSlot(null);

    let currentSlot = (pg * MULTIPLIER) % HASHTABLE_NSLOT;
    const path: number[] = [];

    // Animation loop simulation
    let iterations = 0;
    const interval = setInterval(() => {
      path.push(currentSlot);
      setSearchPath([...path]);

      if (slots[currentSlot].page_number === pg) {
        setFoundSlot(currentSlot);
        clearInterval(interval);
      } else if (slots[currentSlot].page_number === EMPTY || iterations > HASHTABLE_NSLOT) {
        // Miss
        setFoundSlot(-1);
        clearInterval(interval);
      } else {
        currentSlot = (currentSlot + 1) % HASHTABLE_NSLOT;
      }
      iterations++;
    }, 400);

    activeIntervalRef.current = interval;
  };

  const pagesToSearch = [42, 99, 15]; // 42 is hit, 99 is hit (maybe collision), 15 is miss

  return (
    <VizContainer
      title="Lock-Free WAL Index in SHM"
      description="Readers need to find the latest version of a page in the WAL without acquiring locks. They scan a shared-memory (-shm) hash table using open addressing and linear probing, resolving lookups without blocking."
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-8 justify-between">
        {/* Controls */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Reader Query
          </div>
          <div className="flex gap-2">
            {pagesToSearch.map((pg) => (
              <button
                key={pg}
                onClick={() => searchPage(pg)}
                className="px-4 py-1.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-bold transition-colors"
              >
                Find Page {pg}
              </button>
            ))}
          </div>
        </div>

        {/* Math Viz */}
        <div className="flex justify-center h-12">
          <AnimatePresence mode="wait">
            {targetPage !== null && (
              <motion.div
                key={targetPage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 font-mono text-sm bg-white/5 px-6 py-2 rounded-xl border border-white/10"
              >
                <span className="text-teal-400">hash(P{targetPage})</span>
                <span className="text-slate-500">=</span>
                <span className="text-white">
                  ({targetPage} × {MULTIPLIER}) % {HASHTABLE_NSLOT}
                </span>
                <span className="text-slate-500">=</span>
                <span className="text-amber-400 font-black">
                  Slot {(targetPage * MULTIPLIER) % HASHTABLE_NSLOT}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hash Table Array */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="grid grid-cols-8 gap-2 md:gap-4">
            {slots.map((slot, i) => {
              const isSearched = searchPath.includes(i);
              const isFound = foundSlot === i;
              const isMiss = foundSlot === -1 && searchPath[searchPath.length - 1] === i;

              let statusColor = "border-white/10 bg-white/5 text-slate-600";
              if (isSearched) statusColor = "border-amber-500/50 bg-amber-500/20 text-amber-200";
              if (isFound)
                statusColor =
                  "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
              if (isMiss) statusColor = "border-red-500/50 bg-red-500/20 text-red-400";

              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[8px] font-mono text-slate-500">[{i}]</span>
                  <motion.div
                    layout
                    className={`w-10 h-12 md:w-14 md:h-16 rounded-lg border flex flex-col items-center justify-center transition-colors relative ${statusColor}`}
                  >
                    {isSearched && !isFound && !isMiss && (
                      <motion.div
                        layoutId="searchCursor"
                        className="absolute -top-6 text-amber-400"
                      >
                        <Search className="w-4 h-4" />
                      </motion.div>
                    )}

                    {slot.page_number !== EMPTY ? (
                      <>
                        <span className="text-xs md:text-sm font-bold">P{slot.page_number}</span>
                        <span className="text-[8px] md:text-[10px] opacity-70">
                          F:{slot.frame_offset}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] opacity-30 italic">empty</span>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        <div className="flex items-center gap-4 bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 text-xs text-teal-100/70 font-medium">
          <FastForward className="w-6 h-6 text-teal-400 shrink-0" />
          <p>
            Because the load factor is strictly kept below 0.5, linear probing almost always finds
            the target (or an empty slot) in 1 or 2 jumps. Since the table lives in a memory-mapped{" "}
            <code>-shm</code> file, there are zero system calls and zero locks involved in this
            lookup.
          </p>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a simulation of the <code>-shm</code> (Shared Memory) file, which
              contains the <FrankenJargon term="wal-index">WAL Index</FrankenJargon>. It is a flat
              array representing a hash table.
            </div>
            <div>
              Because <FrankenJargon term="mvcc">MVCC</FrankenJargon> writers continuously append
              new page versions to the <FrankenJargon term="wal">WAL</FrankenJargon>, readers need a
              way to figure out the exact frame offset where the most recent version of a page
              lives, and they need to do it without blocking the writers.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Find Page 42</strong>. Watch the math formula at the top compute the
              hash: <code>(42 × 3) % 16 = 14</code>. The reader jumps directly to slot 14 in the
              array and instantly finds the frame offset for Page 42.
            </p>
            <p>
              Now click <strong>Find Page 99</strong>. The hash computes to slot 9. The reader jumps
              there, but wait! Slot 9 is already taken by Page 12 (a hash collision). The reader
              simply steps forward to the next slot (linear probing) and successfully finds Page 99
              in slot 10.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              In standard concurrency models, readers and writers contend on a shared Mutex to
              safely access an index structure. Under high concurrency, thousands of queries
              serialize on that single lock.
            </p>
            <p>
              Because the <FrankenJargon term="wal-index">WAL Index</FrankenJargon> is a heavily
              over-provisioned hash table (load factor strictly capped below 0.5) stored in
              memory-mapped POSIX shared memory, linear probing resolves collisions almost
              instantly. Readers can locate their data with zero system calls and zero blocking
              locks, enabling <FrankenJargon term="mvcc">MVCC</FrankenJargon> read throughput to
              scale linearly with available cores.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
