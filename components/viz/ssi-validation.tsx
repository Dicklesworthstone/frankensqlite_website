"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// Define the state of our simulation
type TxnStatus = "running" | "committed" | "aborted";

interface Transaction {
  id: string;
  name: string;
  readSet: number[];
  writeSet: number[];
  status: TxnStatus;
  color: string;
}

const ALL_PAGES = [1, 2, 3, 4, 5, 6, 7, 8];

const INITIAL_TXNS: Transaction[] = [
  {
    id: "T1",
    name: "Txn 1 (Report)",
    readSet: [1, 2, 3, 4],
    writeSet: [],
    status: "running",
    color: "blue",
  },
  {
    id: "T2",
    name: "Txn 2 (Update)",
    readSet: [3],
    writeSet: [3],
    status: "running",
    color: "emerald",
  },
  {
    id: "T3",
    name: "Txn 3 (Insert)",
    readSet: [8],
    writeSet: [8],
    status: "running",
    color: "amber",
  },
];

export default function SsiValidation() {
  const [txns, setTxns] = useState<Transaction[]>(INITIAL_TXNS);
  const [history, setHistory] = useState<string[]>([]);
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);

  const reset = () => {
    setTxns(INITIAL_TXNS);
    setHistory([]);
  };

  const attemptCommit = (txnId: string) => {
    const txnToCommit = txns.find((t) => t.id === txnId);
    if (!txnToCommit || txnToCommit.status !== "running") return;

    // SSI Validation Logic:
    // Check if any ALREADY COMMITTED transaction wrote to a page that WE read.
    const committedTxns = txns.filter((t) => t.status === "committed");

    let conflictFound = false;
    let conflictDetails = "";

    for (const committed of committedTxns) {
      const overlap = txnToCommit.readSet.filter((page) => committed.writeSet.includes(page));
      if (overlap.length > 0) {
        conflictFound = true;
        conflictDetails = `${committed.id} already modified Page ${overlap[0]}`;
        break;
      }
    }

    setTxns((prev) =>
      prev.map((t) => {
        if (t.id === txnId) {
          return { ...t, status: conflictFound ? "aborted" : "committed" };
        }
        return t;
      }),
    );

    setHistory((prev) =>
      [
        `${txnToCommit.id} requested commit...`,
        conflictFound
          ? `❌ ABORTED: Read-Write conflict detected (${conflictDetails}). Write skew prevented.`
          : `✅ COMMITTED successfully.`,
        ...prev,
      ].slice(0, 6),
    ); // Keep last 6 logs
  };

  const getColorClass = (color: string, type: "text" | "bg" | "border") => {
    const map: Record<string, Record<string, string>> = {
      blue: { text: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
      emerald: {
        text: "text-emerald-400",
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/30",
      },
      amber: { text: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" },
    };
    return map[color][type];
  };

  return (
    <VizContainer
      title="SSI Validation Engine"
      description="Serializable Snapshot Isolation prevents subtle data anomalies (like write skew) without using locks. Click 'Commit' on the transactions below to see how read/write set intersections determine if a commit is safe."
      minHeight={450}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6">
        {/* Memory Pages Visualization */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 mb-3">
            Database Pages
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_PAGES.map((page) => {
              const readers = txns.filter(
                (t) => t.readSet.includes(page) && t.status !== "aborted",
              );
              const writers = txns.filter(
                (t) => t.writeSet.includes(page) && t.status !== "aborted",
              );

              const isHovered = hoveredPage === page;

              return (
                <div
                  key={page}
                  className={`relative flex flex-col items-center justify-center w-12 h-14 rounded-lg border transition-all ${isHovered ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"}`}
                  onMouseEnter={() => setHoveredPage(page)}
                  onMouseLeave={() => setHoveredPage(null)}
                >
                  <span className="text-xs font-bold text-slate-300">P{page}</span>

                  {/* Indicators for Reads/Writes */}
                  <div className="flex gap-0.5 mt-1 overflow-hidden justify-center w-full px-0.5">
                    {readers.map((r) => (
                      <div
                        key={`r-${r.id}`}
                        className={`w-1.5 h-1.5 rounded-full ${getColorClass(r.color, "bg")} ring-1 ring-black`}
                        title={`${r.id} read`}
                      />
                    ))}
                    {writers.map((w) => (
                      <div
                        key={`w-${w.id}`}
                        className={`w-1.5 h-1.5 rounded-sm bg-red-500 ring-1 ring-black`}
                        title={`${w.id} write`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction Lanes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {txns.map((txn) => (
            <div
              key={txn.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-colors ${txn.status === "aborted" ? "border-red-500/30 bg-red-500/5 opacity-60" : txn.status === "committed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]"}`}
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className={`text-xs font-bold ${getColorClass(txn.color, "text")}`}>
                    {txn.name}
                  </div>
                  {txn.status === "committed" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {txn.status === "aborted" && <XCircle className="w-4 h-4 text-red-500" />}
                </div>

                <div className="space-y-1 mb-4">
                  <div className="text-[10px] text-slate-400">
                    <span className="font-mono text-slate-500 mr-2">READ:</span>[
                    {txn.readSet.map((p) => `P${p}`).join(", ")}]
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <span className="font-mono text-slate-500 mr-2">WRITE:</span>
                    {txn.writeSet.length > 0
                      ? `[${txn.writeSet.map((p) => `P${p}`).join(", ")}]`
                      : "None"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => attemptCommit(txn.id)}
                disabled={txn.status !== "running"}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                  txn.status === "running"
                    ? `bg-white/10 hover:bg-white/20 text-white`
                    : `bg-transparent text-slate-500 cursor-not-allowed border border-white/5`
                }`}
              >
                {txn.status === "running" ? "Commit" : txn.status.toUpperCase()}
              </button>
            </div>
          ))}
        </div>

        {/* Audit Log */}
        <div className="rounded-xl border border-white/10 bg-black p-3 md:p-4 flex-1">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              Validation Audit Log
            </div>
            <button
              onClick={reset}
              className="text-[10px] text-teal-400 hover:text-teal-300 uppercase tracking-widest font-bold"
            >
              Reset
            </button>
          </div>
          <div className="font-mono text-[10px] space-y-1.5">
            <AnimatePresence>
              {history.length === 0 && (
                <div className="text-slate-600 italic">
                  Waiting for commit requests... Try committing T2, then T1.
                </div>
              )}
              {history.map((log, i) => (
                <motion.div
                  key={`${log}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${log.includes("ABORTED") ? "text-red-400" : log.includes("COMMITTED") ? "text-emerald-400" : "text-slate-300"}`}
                >
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at the validation engine for{" "}
              <FrankenJargon term="ssi">Serializable Snapshot Isolation</FrankenJargon>. The grid at
              the top represents physical <FrankenJargon term="btree">B-tree</FrankenJargon> pages
              in memory, showing which transactions have read or written to them.
            </div>
            <p>
              Below that are three concurrent transactions. Notice their specific{" "}
              <strong>Read Sets</strong> and <strong>Write Sets</strong>. Because they are running
              concurrently, they all started from the same{" "}
              <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Try clicking <strong>Commit</strong> on Txn 2 (Update). It will succeed because no one
              else has modified Page 3.
            </p>
            <p>
              Now try clicking <strong>Commit</strong> on Txn 1 (Report). It will abort. Look at the
              Audit Log to see why: Txn 1 read Page 3, but Txn 2 already committed a new version of
              Page 3. If Txn 1 were allowed to commit, its snapshot would be invalid.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Most production databases default to weak isolation levels (such as Read Committed or
              Repeatable Read) because traditional Serializable isolation requires heavyweight row
              locks that degrade throughput under contention.
            </div>
            <div>
              FrankenSQLite achieves full <FrankenJargon term="ssi">SSI</FrankenJargon> correctness
              entirely lock-free. It uses{" "}
              <FrankenJargon term="fcw">First-Committer-Wins</FrankenJargon> to detect anomalies at
              the exact moment of commit within the <FrankenJargon term="mvcc">MVCC</FrankenJargon>{" "}
              layer, preventing subtle data corruption like write skew without sacrificing
              concurrent throughput.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
