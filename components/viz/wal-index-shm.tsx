"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FastForward, Hash, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// Scaled down for the demo. SQLite (and FrankenSQLite's compatible codec in
// crates/fsqlite-wal/src/wal_index.rs) uses 8192 slots and (pgno * 383) & 8191.
const HASHTABLE_NSLOT = 16;
const MULTIPLIER = 3;
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

  // Initialize some data. Page 19 and page 99 both hash to slot 9, so looking up
  // page 99 shows a collision resolved by linear probing.
  useEffect(() => {
    const initialPages = [42, 19, 99, 7];
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

  const pagesToSearch = [42, 99, 15]; // 42: direct hit, 99: collision then hit, 15: miss

  return (
    <VizContainer
      title="SQLite's WAL Index (-shm)"
      status="live"
      description="SQLite's WAL index is a hash table in the shared-memory -shm file that maps page numbers to WAL frames. It is SQLite's design. FrankenSQLite implements the same format so stock SQLite processes can read WAL commits that FrankenSQLite publishes."
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-8 justify-between">
        {/* Controls */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Reader Query (16-slot demo)
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
            In the real format each 32 KiB segment has 8,192 hash slots for at most 4,096 frames,
            so a table is never more than half full and probe chains stay short. The hash is{" "}
            <code>(pgno × 383) &amp; 8191</code>. In C SQLite, readers probe this table directly in
            mapped memory; they take a read-mark lock when a read transaction starts, not per
            lookup.
          </p>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              A scaled-down simulation of the <FrankenJargon term="wal-index">WAL index</FrankenJargon>{" "}
              in SQLite&apos;s <code>-shm</code> file. In WAL mode, commits append page images to
              the <FrankenJargon term="wal">WAL</FrankenJargon>, and readers need to find the newest
              frame for a page without scanning the whole log. This hash table is how SQLite does
              it.
            </div>
            <p>
              The demo simplifies the layout. In the real file a hash slot holds a frame index, and
              the page number sits in a parallel array; here each slot shows both.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Find Page 42</strong>. The hash is <code>(42 × 3) % 16 = 14</code>, so
              the reader goes straight to slot 14 and finds the frame for page 42.
            </p>
            <p>
              Click <strong>Find Page 99</strong>. It hashes to slot 9, which page 19 already holds
              (a collision). The reader steps to the next slot (linear probing) and finds page 99
              in slot 10. <strong>Find Page 15</strong> lands on an empty slot, which means the
              page is not in the WAL and is read from the database file.
            </p>
            <p>
              The real lookup also checks the newest segment first and keeps probing to the
              newest matching frame, since one page can appear in the WAL many times.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              The format is SQLite&apos;s, so matching it exactly is what lets stock SQLite and
              FrankenSQLite share a WAL database. On Unix, FrankenSQLite writers publish frame and
              hash entries plus the WAL-index headers into <code>-shm</code>, respect reader marks,
              and coordinate checkpoints and resets with stock SQLite processes.
            </p>
            <p>
              FrankenSQLite&apos;s own readers check the shared header, then look pages up in an
              in-process map of published frames instead of probing <code>-shm</code>. On Windows
              the <code>-shm</code> contents are process-local, so mixing stock SQLite and
              FrankenSQLite WAL connections on one database is not supported there.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
