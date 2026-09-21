"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "./stepper";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Data & Types                                                       */
/* ------------------------------------------------------------------ */

interface VersionEntry {
  version: number;
  txnId: number;
  commitSeq: number | null; // null = uncommitted
  data: string;
}

interface PageState {
  id: number;
  label: string;
  versions: VersionEntry[];
}

interface Transaction {
  id: number;
  label: string;
  snapshotHigh: number;
  status: "active" | "committed" | "ended";
  color: string;
}

const steps: Step[] = [
  {
    label: "Initial State",
    description: "Clean B-tree, all pages at version 1",
  },
  {
    label: "Transaction A starts (TxnId=100)",
    description: "Snapshot captured: high=99",
  },
  {
    label: "Transaction B starts (TxnId=101)",
    description: "Snapshot captured: high=99. Both see same data",
  },
  {
    label: "Transaction B writes Page 5",
    description: "New version created via copy-on-write, tagged TxnId=101",
  },
  {
    label: "Transaction B commits (CommitSeq=100)",
    description: "Version becomes visible to future transactions",
  },
  {
    label: "Transaction A reads Page 5",
    description: "STILL sees old version! commit_seq(100) > snapshot.high(99) = INVISIBLE",
  },
  {
    label: "Transaction C starts (TxnId=102)",
    description: "Snapshot: high=100. CAN see Transaction B's write",
  },
];

/* ------------------------------------------------------------------ */
/*  Derive state per step                                              */
/* ------------------------------------------------------------------ */

function buildState(step: number) {
  // Base pages (root + 4 leaves)
  const basePage = (id: number, label: string): PageState => ({
    id,
    label,
    versions: [{ version: 1, txnId: 0, commitSeq: 0, data: "v1" }],
  });

  const pages: PageState[] = [
    basePage(3, "Page 3"),
    basePage(5, "Page 5"),
    basePage(7, "Page 7"),
    basePage(9, "Page 9"),
  ];

  const transactions: Transaction[] = [];

  // Step 1+: Transaction A
  if (step >= 1) {
    transactions.push({
      id: 100,
      label: "Txn A",
      snapshotHigh: 99,
      status: step >= 6 ? "ended" : "active",
      color: "#60a5fa", // blue
    });
  }

  // Step 2+: Transaction B
  if (step >= 2) {
    transactions.push({
      id: 101,
      label: "Txn B",
      snapshotHigh: 99,
      status: step >= 4 ? "committed" : "active",
      color: "#f59e0b", // amber
    });
  }

  // Step 3+: Page 5 gets a new version from Txn B
  if (step >= 3) {
    const page5 = pages.find((p) => p.id === 5)!;
    page5.versions = [
      {
        version: 2,
        txnId: 101,
        commitSeq: step >= 4 ? 100 : null,
        data: "v2 (B's write)",
      },
      ...page5.versions,
    ];
  }

  // Step 6+: Transaction C
  if (step >= 6) {
    transactions.push({
      id: 102,
      label: "Txn C",
      snapshotHigh: 100,
      status: "active",
      color: "#a78bfa", // violet
    });
  }

  // Which page is highlighted
  let highlightPageId: number | null = null;
  if (step === 3 || step === 4 || step === 5 || step === 6) {
    highlightPageId = 5;
  }

  // Which txn perspective are we showing?
  let perspectiveTxnId: number | null = null;
  if (step === 5) perspectiveTxnId = 100; // Txn A reads
  if (step === 6) perspectiveTxnId = 102; // Txn C reads

  return { pages, transactions, highlightPageId, perspectiveTxnId };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TransactionCard({
  txn,
  isActive,
  step,
}: {
  txn: Transaction;
  isActive: boolean;
  step: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className={`rounded-lg border p-3 transition-colors min-w-[140px] ${
        isActive ? "border-white/20 bg-white/5" : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: txn.color }} />
        <span className="text-xs font-bold text-white">{txn.label}</span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            txn.status === "committed"
              ? "bg-green-500/20 text-green-400"
              : txn.status === "ended"
                ? "bg-slate-500/20 text-slate-400"
                : "bg-teal-500/20 text-teal-400"
          }`}
        >
          {txn.status}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
        <div>TxnId: {txn.id}</div>
        <div>snapshot.high: {txn.snapshotHigh}</div>
      </div>
      {/* Step 5: show Txn A "reads Page 5" annotation */}
      {step === 5 && txn.id === 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-[10px] font-mono text-red-400 border-t border-red-500/20 pt-1.5"
        >
          Reading Page 5...
          <br />
          sees v1 only!
        </motion.div>
      )}
      {/* Step 6: show Txn C "sees new version" annotation */}
      {step === 6 && txn.id === 102 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-[10px] font-mono text-green-400 border-t border-green-500/20 pt-1.5"
        >
          Reading Page 5...
          <br />
          sees v2!
        </motion.div>
      )}
    </motion.div>
  );
}

function VersionBadge({
  entry,
  pageId,
  step,
  isNewest,
}: {
  entry: VersionEntry;
  pageId: number;
  step: number;
  isNewest: boolean;
}) {
  // Determine visibility from Txn A's perspective at step 5
  const isInvisibleToA = step === 5 && pageId === 5 && entry.version === 2;
  // Determine visibility from Txn C's perspective at step 6
  const isVisibleToC = step === 6 && pageId === 5 && entry.version === 2;

  return (
    <motion.div
      layout
      initial={isNewest ? { opacity: 0, scale: 0.8, y: -10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, type: "spring", bounce: 0.3 }}
      className={`relative flex items-center gap-1 md:gap-2 rounded-md border px-1.5 md:px-2 py-1.5 text-[9px] md:text-[10px] font-mono transition-colors flex-wrap ${
        isInvisibleToA
          ? "border-red-500/40 bg-red-500/10"
          : isVisibleToC
            ? "border-green-500/40 bg-green-500/10"
            : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className="text-slate-500">v{entry.version}</span>
      <span className="text-slate-400">txn={entry.txnId}</span>
      <span className={`${entry.commitSeq === null ? "text-amber-400" : "text-slate-400"}`}>
        {entry.commitSeq === null ? "uncommitted" : `cs=${entry.commitSeq}`}
      </span>

      {/* Red X overlay for step 5 — invisible to Txn A */}
      {isInvisibleToA && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white shadow-lg shadow-red-500/30"
        >
          X
        </motion.div>
      )}

      {/* Green check for step 6 — visible to Txn C */}
      {isVisibleToC && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[8px] font-black text-white shadow-lg shadow-green-500/30"
        >
          &#10003;
        </motion.div>
      )}
    </motion.div>
  );
}

function BTreePage({
  page,
  highlight,
  step,
}: {
  page: PageState;
  highlight: boolean;
  step: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Page card */}
      <motion.div
        layout
        animate={{
          borderColor: highlight ? "rgba(20, 184, 166, 0.5)" : "rgba(255,255,255,0.08)",
          boxShadow: highlight ? "0 0 20px rgba(20, 184, 166, 0.15)" : "0 0 0px rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border bg-slate-900/60 px-2 md:px-3 py-2 text-center"
      >
        <div className="text-[10px] text-slate-500 font-mono">Page {page.id}</div>
      </motion.div>

      {/* Version chain */}
      <div className="flex flex-col gap-1 w-full">
        <AnimatePresence mode="popLayout">
          {page.versions.map((v) => (
            <VersionBadge
              key={`${page.id}-v${v.version}`}
              entry={v}
              pageId={page.id}
              step={step}
              isNewest={v.version > 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visibility rule callout for step 5                                 */
/* ------------------------------------------------------------------ */

function VisibilityCallout({ step }: { step: number }) {
  if (step !== 5) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-4 rounded-xl border border-red-500/30 bg-red-500/[0.07] p-4 text-center"
    >
      <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
        Snapshot Isolation Rule
      </div>
      <div className="font-mono text-sm text-white leading-relaxed">
        <span className="text-amber-400">commit_seq</span>
        <span className="text-slate-500">(</span>
        <span className="text-white">100</span>
        <span className="text-slate-500">)</span>
        {" > "}
        <span className="text-blue-400">snapshot.high</span>
        <span className="text-slate-500">(</span>
        <span className="text-white">99</span>
        <span className="text-slate-500">)</span>
        {" = "}
        <span className="text-red-400 font-black">INVISIBLE</span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400">
        Transaction A started before B committed, so A cannot see B&apos;s changes. This is snapshot
        isolation in action.
      </div>
    </motion.div>
  );
}

function VisibilityCalloutC({ step }: { step: number }) {
  if (step !== 6) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-4 rounded-xl border border-green-500/30 bg-green-500/[0.07] p-4 text-center"
    >
      <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Visible!</div>
      <div className="font-mono text-sm text-white leading-relaxed">
        <span className="text-amber-400">commit_seq</span>
        <span className="text-slate-500">(</span>
        <span className="text-white">100</span>
        <span className="text-slate-500">)</span>
        {" <= "}
        <span className="text-violet-400">snapshot.high</span>
        <span className="text-slate-500">(</span>
        <span className="text-white">100</span>
        <span className="text-slate-500">)</span>
        {" = "}
        <span className="text-green-400 font-black">VISIBLE</span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400">
        Transaction C started after B committed, so it can see B&apos;s write.
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function VersionChainExplorer() {
  const [currentStep, setCurrentStep] = useState(0);

  const { pages, transactions, highlightPageId, perspectiveTxnId } = useMemo(
    () => buildState(currentStep),
    [currentStep],
  );

  // Determine which txn is "active" in the sidebar for highlight
  const activeTxnId = perspectiveTxnId ?? transactions.at(-1)?.id ?? null;

  return (
    <VizContainer
      title="Page Version Chain Explorer"
      description={
        <>
          Walk through how <FrankenJargon term="mvcc">MVCC</FrankenJargon>{" "}
          <FrankenJargon term="snapshot-isolation">snapshot isolation</FrankenJargon> works at the
          page level. Each step shows how transactions, B-tree pages, and version chains interact.
        </>
      }
      minHeight={480}
    >
      <div className="p-3 md:p-6">
        {/* Main layout: sidebar + B-tree */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Left sidebar: Active Transactions */}
          <div className="md:w-48 shrink-0">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              Active Transactions
            </div>
            <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              <AnimatePresence mode="popLayout">
                {transactions.map((txn) => (
                  <TransactionCard
                    key={txn.id}
                    txn={txn}
                    isActive={txn.id === activeTxnId}
                    step={currentStep}
                  />
                ))}
              </AnimatePresence>
              {transactions.length === 0 && (
                <div className="text-[10px] text-slate-600 italic py-4">No active transactions</div>
              )}
            </div>
          </div>

          {/* Center: B-tree visualization */}
          <div className="flex-1 min-w-0">
            {/* Root node */}
            <div className="flex justify-center mb-4">
              <motion.div
                layout
                className="rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2 text-center"
              >
                <div className="text-[10px] text-slate-500 font-mono">Root (Page 1)</div>
                <div className="text-[9px] text-slate-600 font-mono mt-0.5">ptrs: [3, 5, 7, 9]</div>
              </motion.div>
            </div>

            {/* Connector lines (pure CSS) */}
            <div className="flex justify-center mb-2">
              <div className="w-[70%] h-px bg-white/10 relative">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-3 w-px bg-white/10"
                    style={{ left: `${i * 33.33}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Leaf pages + version chains */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pages.map((page) => (
                <BTreePage
                  key={page.id}
                  page={page}
                  highlight={page.id === highlightPageId}
                  step={currentStep}
                />
              ))}
            </div>

            {/* Visibility callouts */}
            <AnimatePresence mode="wait">
              <VisibilityCallout key="callout-a" step={currentStep} />
              <VisibilityCalloutC key="callout-c" step={currentStep} />
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom: Stepper controls */}
        <div className="mt-6 border-t border-white/5 pt-4">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            autoPlayInterval={3000}
          />
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at FrankenSQLite&apos;s{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> version chain in action. The left
              sidebar shows active transactions with their{" "}
              <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon> boundaries. The
              center shows <FrankenJargon term="btree">B-tree</FrankenJargon> leaf pages with
              stacked version badges, each representing a committed page state.
            </p>
            <p>
              The key concept is visibility: each transaction sees only the page versions that were
              committed before its <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>{" "}
              started. Versions committed after that point are invisible, even if they exist on
              disk.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Step through the 7 stages using the controls. Watch Transaction A start and capture a
              snapshot, then Transaction B start with a later snapshot. When B writes to a page and
              commits, step forward to see A read the same page; it still sees the old version
              because B&apos;s commit happened after A&apos;s snapshot.
            </p>
            <p>
              Pay attention to the visibility callouts that show the commit sequence number
              comparison. This single comparison is the entire{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> visibility rule.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              This mechanism is what allows multiple concurrent readers and writers to coexist
              without locks. Long-running analytical queries see a stable, consistent view of the
              database while OLTP transactions continue writing in parallel. Unlike C SQLite, where
              a writer blocks all readers (or vice versa in WAL mode for writes),
              FrankenSQLite&apos;s <FrankenJargon term="mvcc">MVCC</FrankenJargon> gives every
              transaction its own isolated view of the world.{" "}
              <FrankenJargon term="time-travel">Time-travel queries</FrankenJargon> exploit the same
              mechanism to read historical snapshots on demand.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
