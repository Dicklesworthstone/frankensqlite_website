"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// A small model of FrankenSQLite's commit-time checks for BEGIN CONCURRENT
// transactions that all started from the same snapshot:
//   1. First-committer-wins (FCW): did a transaction that already committed
//      write a page this one also writes? Then abort (base drift).
//   2. Read-only transactions skip the SSI check.
//   3. Page-SSI (conservative Cahill/Fekete rule): record rw-antidependency
//      edges against the other live transactions. If this transaction ends up
//      with an incoming AND an outgoing edge, it is a pivot: abort it. Also
//      abort if committing would complete a structure around a transaction
//      that already committed as a pivot.
// Aborts surface as SQLITE_BUSY_SNAPSHOT; the application retries.

type TxnStatus = "running" | "committed" | "aborted";

interface Transaction {
  id: string;
  name: string;
  detail: string;
  readSet: number[];
  writeSet: number[];
  status: TxnStatus;
  color: string;
  /** Someone concurrent read a page this transaction writes (R -rw-> this). */
  hasIn: boolean;
  /** This transaction read a page someone concurrent writes (this -rw-> W). */
  hasOut: boolean;
  /** An earlier commit found this transaction to be a pivot; it will abort. */
  marked: boolean;
}

interface RwEdge {
  from: string;
  to: string;
  page: number;
}

const ALL_PAGES = [1, 2, 3, 4, 5, 6, 7, 8];

const INITIAL_TXNS: Transaction[] = [
  {
    id: "T1",
    name: "T1 · Alice goes off call",
    detail: "Checks both doctors' rows, then updates Alice's row (page 3).",
    readSet: [3, 7],
    writeSet: [3],
    status: "running",
    color: "blue",
    hasIn: false,
    hasOut: false,
    marked: false,
  },
  {
    id: "T2",
    name: "T2 · Bob goes off call",
    detail: "Checks both doctors' rows, then updates Bob's row (page 7).",
    readSet: [3, 7],
    writeSet: [7],
    status: "running",
    color: "emerald",
    hasIn: false,
    hasOut: false,
    marked: false,
  },
  {
    id: "T3",
    name: "T3 · Report",
    detail: "Read-only scan of pages 1 to 4.",
    readSet: [1, 2, 3, 4],
    writeSet: [],
    status: "running",
    color: "amber",
    hasIn: false,
    hasOut: false,
    marked: false,
  },
];

const overlap = (a: number[], b: number[]) => a.filter((p) => b.includes(p));

export default function SsiValidation() {
  const [txns, setTxns] = useState<Transaction[]>(INITIAL_TXNS);
  const [edges, setEdges] = useState<RwEdge[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);

  const reset = () => {
    setTxns(INITIAL_TXNS);
    setEdges([]);
    setHistory([]);
  };

  const attemptCommit = (txnId: string) => {
    const me = txns.find((t) => t.id === txnId);
    if (!me || me.status !== "running") return;

    const log: string[] = [`${me.id} requested commit...`];
    const finish = (
      nextTxns: Transaction[],
      newEdges: RwEdge[],
      verdict: "COMMITTED" | "ABORTED",
      why: string,
    ) => {
      setTxns(nextTxns);
      if (newEdges.length > 0) setEdges((prev) => [...prev, ...newEdges]);
      log.push(
        verdict === "COMMITTED"
          ? `COMMITTED: ${why}`
          : `ABORTED (SQLITE_BUSY_SNAPSHOT): ${why} The app retries ${me.id}.`,
      );
      setHistory((prev) => [...log, ...prev].slice(0, 10));
    };
    const withStatus = (status: TxnStatus) =>
      txns.map((t) => (t.id === me.id ? { ...t, status } : t));

    // Marked for abort by an earlier commit.
    if (me.marked) {
      finish(
        withStatus("aborted"),
        [],
        "ABORTED",
        `an earlier commit found ${me.id} to be a pivot (rw edges in and out).`,
      );
      return;
    }

    // 1. First-committer-wins on pages this transaction writes.
    for (const other of txns) {
      if (other.status !== "committed") continue;
      const shared = overlap(me.writeSet, other.writeSet);
      if (shared.length > 0) {
        finish(
          withStatus("aborted"),
          [],
          "ABORTED",
          `FCW: ${other.id} already committed a new version of page ${shared[0]}.`,
        );
        return;
      }
    }

    // 2. Read-only transactions skip SSI.
    if (me.writeSet.length === 0) {
      finish(withStatus("committed"), [], "COMMITTED", "read-only, so the SSI check is skipped.");
      return;
    }

    // 3. Page-SSI: discover rw-antidependency edges with live transactions.
    const live = txns.filter((t) => t.id !== me.id && t.status !== "aborted");
    const inEdges: RwEdge[] = [];
    const outEdges: RwEdge[] = [];
    for (const r of live) {
      const pages = overlap(r.readSet, me.writeSet);
      if (pages.length > 0) inEdges.push({ from: r.id, to: me.id, page: pages[0] });
    }
    for (const w of live) {
      const pages = overlap(me.readSet, w.writeSet);
      if (pages.length > 0) outEdges.push({ from: me.id, to: w.id, page: pages[0] });
    }
    const newEdges = [...inEdges, ...outEdges].filter(
      (e) => !edges.some((x) => x.from === e.from && x.to === e.to),
    );
    for (const e of newEdges) {
      log.push(`rw edge ${e.from} → ${e.to} (${e.from} read page ${e.page}, ${e.to} writes it)`);
    }

    const hasIn = me.hasIn || inEdges.length > 0;
    const hasOut = me.hasOut || outEdges.length > 0;

    if (hasIn && hasOut) {
      finish(
        withStatus("aborted"),
        newEdges,
        "ABORTED",
        `${me.id} has an rw edge coming in and one going out, so it is a pivot.`,
      );
      return;
    }

    const committedPivot =
      inEdges.find((e) => txns.find((t) => t.id === e.from && t.status === "committed")?.hasIn) ??
      outEdges.find((e) => txns.find((t) => t.id === e.to && t.status === "committed")?.hasOut);
    if (committedPivot) {
      const pivotId = committedPivot.from === me.id ? committedPivot.to : committedPivot.from;
      finish(
        withStatus("aborted"),
        newEdges,
        "ABORTED",
        `${pivotId} already committed as a pivot and cannot be undone.`,
      );
      return;
    }

    // Commit: record the edges on both ends; mark active pivots for abort.
    const inFrom = new Set(inEdges.map((e) => e.from));
    const outTo = new Set(outEdges.map((e) => e.to));
    const next = txns.map((t) => {
      if (t.id === me.id) return { ...t, status: "committed" as const, hasIn, hasOut };
      if (t.status === "aborted") return t;
      const u = { ...t };
      if (inFrom.has(t.id)) u.hasOut = true;
      if (outTo.has(t.id)) u.hasIn = true;
      if (u.status === "running" && u.hasIn && u.hasOut) u.marked = true;
      return u;
    });
    for (const t of next) {
      if (t.marked && !txns.find((o) => o.id === t.id)?.marked) {
        log.push(`${t.id} now has rw edges in and out; it is marked to abort.`);
      }
    }
    finish(
      next,
      newEdges,
      "COMMITTED",
      newEdges.length > 0
        ? "edges recorded, but no pivot formed."
        : "no rw-antidependencies with live transactions.",
    );
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
      title="SSI Validation"
      description="Plain snapshot isolation lets write skew through. FrankenSQLite's Serializable Snapshot Isolation records which pages each transaction read and wrote, and at commit looks for a transaction with an rw-antidependency coming in and another going out. Click Commit to try it."
      minHeight={450}
      status="live"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6">
        {/* Memory Pages Visualization */}
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 mb-3">
            Database Pages <span className="text-slate-500">(dot = read, square = write)</span>
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
          {edges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px]">
              {edges.map((e) => (
                <span
                  key={`${e.from}-${e.to}`}
                  className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-300"
                >
                  {e.from} →rw {e.to} (P{e.page})
                </span>
              ))}
            </div>
          )}
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

                <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">{txn.detail}</p>

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
                  {txn.marked && txn.status === "running" && (
                    <div className="text-[10px] font-bold text-red-400">Marked to abort</div>
                  )}
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
              Validation Log
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
                  Waiting for commit requests... Try committing T3, then T1, then T2.
                </div>
              )}
              {history.map((log, i) => (
                <motion.div
                  key={`${log}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${log.startsWith("ABORTED") ? "text-red-400" : log.startsWith("COMMITTED") ? "text-emerald-400" : "text-slate-300"}`}
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
              A small model of the commit-time checks behind{" "}
              <FrankenJargon term="ssi">Serializable Snapshot Isolation</FrankenJargon>. The grid
              shows which <FrankenJargon term="btree">B-tree</FrankenJargon> pages each
              transaction has read and written.
            </div>
            <p>
              The three transactions run concurrently from the same{" "}
              <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>. T1 and T2 are the
              classic write-skew pair: a hospital needs at least one doctor on call, and each
              transaction checks that the other doctor is on call before taking itself off. They
              write different pages, so nothing conflicts at the page level.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Commit <strong>T3</strong> first. It only reads, so it commits without an SSI check.
            </p>
            <p>
              Then commit <strong>T1</strong>. T2 read page 3, which T1 writes (an edge into T1),
              and T1 read page 7, which T2 writes (an edge out of T1). With an edge in and an edge
              out, T1 is a pivot and is aborted with <code>SQLITE_BUSY_SNAPSHOT</code>. Now commit
              T2: with T1 gone it has no dangerous edges and commits. Reset and try T2 first to
              see the mirror image.
            </p>
            <p>
              Under plain snapshot isolation (<code>PRAGMA fsqlite.serializable = OFF</code>) both
              doctors would commit and nobody would be on call.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              Write skew is easy to miss because no two transactions write the same data. Plain{" "}
              <FrankenJargon term="snapshot-isolation">snapshot isolation</FrankenJargon> lets it
              through. FrankenSQLite runs SSI by default for concurrent writers: same-page writes
              are caught first by <FrankenJargon term="fcw">first-committer-wins</FrankenJargon>,
              and SSI then catches the read/write patterns that FCW cannot see.
            </div>
            <div>
              The rule is conservative. It aborts any transaction with an rw edge in and out,
              without waiting to see whether a real cycle forms, and it tracks reads per page, so
              two transactions that touch different rows on the same page look related. That means
              some aborts are unnecessary. The cost is a retry; the benefit is that write skew
              does not slip through. Reads take no locks; the bookkeeping is a per-page record of
              who read what, checked inside the commit step.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
