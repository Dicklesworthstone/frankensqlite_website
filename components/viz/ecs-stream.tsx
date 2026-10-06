"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cpu, Database, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface Block {
  id: string;
  type: "data" | "parity";
  label: string;
  txn: number;
}

export default function EcsStream() {
  const [stream, setStream] = useState<Block[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [txnCounter, setTxnCounter] = useState(100);
  const [corruptedId, setCorruptedId] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasSimulatingRef = useRef(false);

  const insertTxn = useCallback(() => {
    const txn = txnCounter;
    setTxnCounter((prev) => prev + 1);

    // 2 data blocks, 1 repair block per commit (an illustrative ratio, not the design's budget)
    const newBlocks: Block[] = [
      { id: `d1-${txn}`, type: "data", label: `P${Math.floor(Math.random() * 20)}`, txn },
      { id: `d2-${txn}`, type: "data", label: `P${Math.floor(Math.random() * 20)}`, txn },
      { id: `p1-${txn}`, type: "parity", label: `Repair`, txn },
    ];

    setStream((prev) => [...prev, ...newBlocks].slice(-15)); // keep last 15
  }, [txnCounter]);

  useEffect(() => {
    if (isSimulating) {
      timeoutRef.current = setInterval(insertTxn, 1500);
    } else if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    };
  }, [isSimulating, insertTxn]);

  const corruptBlock = (id: string) => {
    if (isRecovering) return;
    wasSimulatingRef.current = isSimulating;
    setCorruptedId(id);
    setIsRecovering(true);
    setIsSimulating(false); // Pause simulation during recovery

    if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);

    recoveryTimeoutRef.current = setTimeout(() => {
      setCorruptedId(null);
      setIsRecovering(false);
      setIsSimulating(wasSimulatingRef.current);
    }, 2000);
  };

  return (
    <VizContainer
      title="Erasure-Coded Stream (ECS)"
      status="design"
      description="In FrankenSQLite's native-mode design, durable state is an append-only stream of immutable objects, each stored as RaptorQ source and repair symbols. Parts of it are implemented, but native mode is not something you can switch on today. The default runtime uses standard SQLite files."
      minHeight={350}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 justify-between">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500">
            Simulated Stream (Design)
          </div>
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            disabled={isRecovering}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isSimulating ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-teal-500 text-black hover:bg-teal-400"} disabled:opacity-50`}
          >
            {isSimulating ? "Pause DB Writers" : "Start DB Writers"}
          </button>
        </div>

        {/* The Stream */}
        <div className="relative flex-1 bg-black/40 rounded-xl border border-white/10 p-4 overflow-hidden flex items-center">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-500 z-10 bg-black/80 px-2 py-1 rounded backdrop-blur">
            <Cpu className="w-4 h-4" />
            <span className="text-[10px] font-mono">RAM</span>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-teal-500 z-10 bg-black/80 px-2 py-1 rounded backdrop-blur">
            <span className="text-[10px] font-mono">DISK</span>
            <Database className="w-4 h-4" />
          </div>

          {/* Stream Track */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-white/5" />

          {/* Blocks */}
          <div className="flex gap-2 items-center justify-end w-full pl-24 pr-20 overflow-hidden relative">
            <AnimatePresence initial={false}>
              {stream.map((block) => {
                const isCorrupted = corruptedId === block.id;

                return (
                  <motion.div
                    key={block.id}
                    layout
                    initial={{ opacity: 0, x: -50, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      y: isCorrupted ? [0, -5, 5, -5, 0] : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    transition={
                      isCorrupted
                        ? { duration: 0.4, repeat: Infinity }
                        : { type: "spring", stiffness: 300, damping: 25 }
                    }
                    onClick={() => block.type === "data" && corruptBlock(block.id)}
                    className={`relative shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-lg border ${block.type === "data" ? "cursor-pointer" : "cursor-default"} transition-colors ${
                      isCorrupted
                        ? "border-red-500 bg-red-500/20"
                        : block.type === "data"
                          ? "border-teal-500/40 bg-teal-500/10 hover:border-teal-400"
                          : "border-purple-500/40 bg-purple-500/10"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${isCorrupted ? "text-red-400" : block.type === "data" ? "text-teal-300" : "text-purple-300"}`}
                    >
                      {block.label}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-1">
                      Commit {block.txn}
                    </span>

                    {isCorrupted && <div className="absolute -top-2 -right-2 text-xs">🔥</div>}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {stream.length === 0 && !isSimulating && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                Stream empty. Start writers.
              </div>
            )}
          </div>
        </div>

        {/* Narrative / Context */}
        <div className="flex gap-4">
          <div className="flex-1 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              RaptorQ is <FrankenJargon term="systematic-layout">systematic</FrankenJargon>: the
              source symbols are the original bytes, so reading an intact{" "}
              <strong className="text-teal-400">data block</strong> needs no decoding.
            </div>
          </div>
          <div className="flex-1 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 flex items-start gap-3">
            <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 text-xs font-bold">
              R
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Click a data block to simulate damage. In the design, each stored symbol carries an
              XXH3 check, and the <strong className="text-purple-400">repair symbols</strong> are
              only read when a check fails.
            </p>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              A simulation of the <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon>,
              the storage substrate in FrankenSQLite&apos;s native-mode design. Instead of
              overwriting pages in a database file, native mode would append immutable commit
              objects (<code>CommitCapsule</code>s holding page deltas and intent logs) and make
              each one durable with a small <code>CommitMarker</code> record.
            </div>
            <div>
              The purple blocks are{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>. Each object is
              encoded with <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> into source
              symbols plus repair symbols. The one-repair-per-two-pages ratio here is illustrative;
              the design&apos;s default budget is 20% overhead with a floor of 2 extra symbols.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Start DB Writers</strong> to begin the stream, then click a green data
              block to simulate a bad sector or a flipped bit (shown with a fire icon).
            </p>
            <div>
              The simulation pauses while it rebuilds the block. In the design, a reader that hits
              a failed check gathers enough intact symbols for that object, source or repair, and
              decodes it with <FrankenJargon term="gf256">GF(256)</FrankenJargon> arithmetic. This
              repair path is not part of the default runtime.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              Stock SQLite has no per-page checksums in the main database file by default. A
              flipped bit can go unnoticed or surface later as <code>SQLITE_CORRUPT</code>, and the
              fix is a restore from backup.
            </p>
            <div>
              Erasure coding stores enough redundancy to rebuild lost symbols without keeping a
              second full copy, and the{" "}
              <FrankenJargon term="systematic-layout">systematic layout</FrankenJargon> means intact
              data is read without decoding. FrankenSQLite has the RaptorQ codec and pieces of
              this format in code. The closest thing that ships is the{" "}
              <FrankenJargon term="wal-fec">-wal-fec</FrankenJargon> sidecar of repair symbols for
              WAL commits, which ordinary recovery does not read yet.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
