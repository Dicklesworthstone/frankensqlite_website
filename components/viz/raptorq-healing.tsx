"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/* Illustrative numbers. They follow the engine's repair-budget policy
   (crates/fsqlite-core/src/repair_symbols.rs): R = max(2, ceil(K * overhead%)),
   with 2 symbols held back as decode slack, so R - 2 losses fit the budget. */
const TOTAL_PAGES = 16; // K source symbols
const OVERHEAD_PCT = 20;
const DECODE_SLACK = 2;
const REPAIR_SYMBOLS = Math.max(DECODE_SLACK, Math.ceil((TOTAL_PAGES * OVERHEAD_PCT) / 100)); // R = 4
const MAX_CORRUPT_BEFORE_FAILURE = REPAIR_SYMBOLS - DECODE_SLACK; // 2
const RECOVERY_DELAY_MS = 800;
const RECOVERY_DURATION_MS = 1200;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PageStatus = "healthy" | "corrupted" | "recovering" | "repaired";

interface PageState {
  id: number;
  status: PageStatus;
  health: number; // 0-100
  corruptedAt?: number;
  recoveryStart?: number;
}

interface RepairSymbol {
  id: string;
  fromAngle: number;
  targetPage: number;
  startTime: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initPages(): PageState[] {
  return Array.from({ length: TOTAL_PAGES }, (_, i) => ({
    id: i,
    status: "healthy" as const,
    health: 100,
  }));
}

/**
 * Toy model only: N = K + R symbols fail independently with probability p, and
 * an ideal decoder needs any K of them. Union bound on losing more than R:
 *   P(> R lost) <= C(K+R, R+1) * p^(R+1)
 * Computed in log space. This is not a durability figure for FrankenSQLite.
 */
function computeToyLossBound(K: number, p: number, overheadPct: number) {
  const R = Math.ceil((overheadPct / 100) * K);
  if (p <= 0) return { pLoss: 0, R };

  // log10 C(K+R, R+1) = sum_{i=1}^{R+1} log10((K - 1 + i) / i)
  let logComb = 0;
  for (let i = 1; i <= R + 1; i++) {
    logComb += Math.log10(K - 1 + i) - Math.log10(i);
  }

  const logPLoss = Math.min(0, logComb + (R + 1) * Math.log10(p));
  const pLoss = logPLoss < -300 ? 0 : 10 ** logPLoss;

  return { pLoss, R };
}

function formatExponent(val: number): string {
  if (val === 0 || val < 1e-300) return "< 10^-300";
  const exp = Math.floor(Math.log10(val));
  const mantissa = val / 10 ** exp;
  if (exp > -3) return val.toExponential(2);
  return `${mantissa.toFixed(1)} x 10^${exp}`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function PageTile({
  page,
  onClick,
  repairSymbols,
}: {
  page: PageState;
  onClick: () => void;
  repairSymbols: RepairSymbol[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const statusColors: Record<PageStatus, string> = {
    healthy: "border-emerald-500/40 bg-emerald-500/10",
    corrupted: "border-red-500/60 bg-red-500/15",
    recovering: "border-blue-400/50 bg-blue-400/10",
    repaired: "border-teal-500/60 bg-teal-500/15",
  };

  const healthBarColor: Record<PageStatus, string> = {
    healthy: "bg-emerald-500",
    corrupted: "bg-red-500",
    recovering: "bg-blue-400",
    repaired: "bg-teal-500",
  };

  const textColor: Record<PageStatus, string> = {
    healthy: "text-emerald-400",
    corrupted: "text-red-400",
    recovering: "text-blue-300",
    repaired: "text-teal-400",
  };

  const isCorrupted = page.status === "corrupted";
  const symbolsForPage = repairSymbols.filter((s) => s.targetPage === page.id);

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        aria-label={`Page ${page.id}, ${page.status}`}
        className={`relative w-full aspect-square min-h-[44px] rounded-lg border ${statusColors[page.status]} flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden`}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
        animate={
          isCorrupted && !prefersReducedMotion
            ? {
                x: [0, -3, 3, -2, 2, 0],
                transition: { duration: 0.4, ease: "easeInOut" },
              }
            : { x: 0 }
        }
      >
        {/* Page number */}
        <span className={`text-xs font-black tabular-nums ${textColor[page.status]}`}>
          {page.id}
        </span>

        {/* Status icon */}
        <span className="text-[8px] font-bold uppercase tracking-wider text-white/40">
          {page.status === "healthy" && "OK"}
          {page.status === "corrupted" && "ERR"}
          {page.status === "recovering" && "FIX"}
          {page.status === "repaired" && "OK"}
        </span>

        {/* Health bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
          <motion.div
            className={`h-full ${healthBarColor[page.status]}`}
            initial={false}
            animate={{ width: `${page.health}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Recovering pulse overlay */}
        {page.status === "recovering" && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-blue-400/10"
            animate={prefersReducedMotion ? { opacity: 0.2 } : { opacity: [0.1, 0.3, 0.1] }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }
          />
        )}

        {/* Repaired flash */}
        {page.status === "repaired" && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-teal-400/20"
            initial={prefersReducedMotion ? false : { opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8 }}
          />
        )}
      </motion.button>

      {/* Repair symbol dots orbiting corrupted/recovering pages */}
      {!prefersReducedMotion && (
        <AnimatePresence>
          {symbolsForPage.map((sym, i) => {
            const angle = sym.fromAngle + i * (360 / Math.max(symbolsForPage.length, 1));
            const rad = (angle * Math.PI) / 180;
            const radius = 28;
            return (
              <motion.div
                key={sym.id}
                className="absolute w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.6)]"
                style={{
                  top: "50%",
                  left: "50%",
                }}
                initial={{
                  x: Math.cos(rad) * radius - 4,
                  y: Math.sin(rad) * radius - 4,
                  opacity: 0,
                  scale: 0,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.5],
                }}
                transition={{
                  duration: RECOVERY_DURATION_MS / 1000,
                  ease: "easeIn",
                  delay: i * 0.1,
                }}
                exit={{ opacity: 0, scale: 0 }}
              />
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

function StatusPanel({
  pages,
  failureMessage,
}: {
  pages: PageState[];
  failureMessage: string | null;
}) {
  const corrupted = pages.filter(
    (p) => p.status === "corrupted" || p.status === "recovering",
  ).length;
  const repaired = pages.filter((p) => p.status === "repaired").length;
  const symbolsAvailable = MAX_CORRUPT_BEFORE_FAILURE - corrupted;

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 space-y-3">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500">
        Recovery Status (simulated)
      </div>

      <div className="space-y-2">
        <StatusRow
          label="Damaged pages"
          value={`${corrupted}/${TOTAL_PAGES}`}
          color={corrupted > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <StatusRow
          label={`Repair symbols (${OVERHEAD_PCT}%)`}
          value={`${REPAIR_SYMBOLS}`}
          color="text-slate-300"
        />
        <StatusRow
          label="Loss budget left"
          value={`${Math.max(0, symbolsAvailable)}`}
          color={symbolsAvailable <= 0 ? "text-red-400" : "text-teal-400"}
        />
        <StatusRow label="Repaired pages" value={`${repaired}`} color="text-teal-400" />
      </div>

      {/* Status message */}
      <AnimatePresence mode="wait">
        {failureMessage ? (
          <motion.div
            key="failure"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
          >
            <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-300 leading-relaxed">{failureMessage}</span>
          </motion.div>
        ) : corrupted > 0 ? (
          <motion.div
            key="recovering"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 rounded-lg border border-blue-400/30 bg-blue-400/10 p-3"
          >
            <Zap className="h-4 w-4 text-blue-300 shrink-0 mt-0.5" />
            <span className="text-xs text-blue-200 leading-relaxed">
              Simulated RaptorQ decode rebuilding the damaged pages...
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="healthy"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-xs text-emerald-300 leading-relaxed">
              All pages intact. Click a page to simulate damage.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-black tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fountain Codes Explainer                                           */
/* ------------------------------------------------------------------ */

function FountainCodesExplainer() {
  const columns = [
    {
      title: "Encode",
      color: "text-teal-400",
      borderColor: "border-teal-500/20",
      bgColor: "bg-teal-500/5",
      text: "RaptorQ treats a block of data as K source symbols and computes R repair symbols from them. Today, file-backed connections can write repair symbols for each WAL commit to a separate -wal-fec sidecar file; the source symbols stay in the WAL.",
    },
    {
      title: "Detect",
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
      bgColor: "bg-amber-500/5",
      text: "Checksums find damage: SQLite's WAL frame checksums today, and a per-symbol XXH3 check in the native-mode design. A checksum only says something is wrong. The default runtime does not yet answer a failed check with a repair.",
    },
    {
      title: "Reconstruct",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      bgColor: "bg-emerald-500/5",
      text: "With about K intact symbols (any mix of source and repair) the decoder solves a linear system over GF(256) to rebuild the missing ones. Exactly K is usually enough; one or two extra symbols make decode failure much rarer (RFC 6330 §5.8).",
    },
  ] as const;

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 space-y-3">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500">
        How Fountain Codes Work
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {columns.map((col) => (
          <div
            key={col.title}
            className={`rounded-lg border ${col.borderColor} ${col.bgColor} p-3 space-y-1.5`}
          >
            <div className={`text-xs font-black uppercase tracking-wider ${col.color}`}>
              {col.title}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{col.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toy loss model                                                     */
/* ------------------------------------------------------------------ */

function ToyLossModel() {
  const [K, setK] = useState(1000);
  const [pExp, setPExp] = useState(-3); // log10(p)
  const [overhead, setOverhead] = useState(20);

  const p = 10 ** pExp;

  const { pLoss, R } = useMemo(() => computeToyLossBound(K, p, overhead), [K, p, overhead]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 space-y-4">
      <div className="space-y-1">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500">
          Toy Model: Independent Symbol Loss
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          A textbook simplification, not a FrankenSQLite durability figure. It assumes symbols fail
          independently and an ideal decoder that needs exactly K symbols. Real failures are
          correlated, and the project publishes no end-to-end durability number.
        </p>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SliderWithLabel
          label="Source symbols (K)"
          min={100}
          max={50000}
          step={100}
          value={K}
          onChange={setK}
          display={K.toLocaleString()}
        />
        <SliderWithLabel
          label="Per-symbol loss prob (p)"
          min={-6}
          max={-2}
          step={0.5}
          value={pExp}
          onChange={setPExp}
          display={`10^${pExp}`}
        />
        <SliderWithLabel
          label="Overhead %"
          min={5}
          max={50}
          step={1}
          value={overhead}
          onChange={setOverhead}
          display={`${overhead}%`}
        />
      </div>

      {/* Formula and results */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <div className="text-[10px] text-slate-500 font-mono leading-relaxed">
          P(more than R of K+R lost) &le; C(K+R, R+1) &times; p^(R+1)
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-600 leading-relaxed">
          <span>
            <strong className="text-slate-400">K</strong> = source symbols in one block
          </span>
          <span>
            <strong className="text-slate-400">R</strong> = repair symbols (from overhead %)
          </span>
          <span>
            <strong className="text-slate-400">p</strong> = chance a given symbol is lost
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          K={K.toLocaleString()}, R={R.toLocaleString()}, p={p.toExponential(0)}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-1">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
              Union bound (toy model)
            </div>
            <div className="text-sm font-black text-white tabular-nums">
              {formatExponent(pLoss)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderWithLabel({
  label,
  min,
  max,
  step,
  value,
  onChange,
  display,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400">{label}</span>
        <span className="text-[10px] font-black text-white tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-11 accent-teal-500"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function RaptorQHealing() {
  const [pages, setPages] = useState<PageState[]>(initPages);
  const [repairSymbols, setRepairSymbols] = useState<RepairSymbol[]>([]);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const symbolIdRef = useRef(0);

  const reset = useCallback(() => {
    // Clear all pending timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setPages(initPages());
    setRepairSymbols([]);
    setFailureMessage(null);
    symbolIdRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const corruptPage = useCallback((pageId: number) => {
    setPages((prev) => {
      const page = prev[pageId];
      // Can only corrupt healthy or repaired pages
      if (page.status !== "healthy" && page.status !== "repaired") return prev;

      // Count currently corrupted/recovering pages (excluding this one)
      const currentlyBroken = prev.filter(
        (p) => p.status === "corrupted" || p.status === "recovering",
      ).length;

      // Check if corruption would exceed repair capacity
      if (currentlyBroken >= MAX_CORRUPT_BEFORE_FAILURE) {
        setFailureMessage(
          `Loss budget exceeded. ${REPAIR_SYMBOLS} repair symbols minus ${DECODE_SLACK} held as decode slack leaves room for ${MAX_CORRUPT_BEFORE_FAILURE} lost pages at once. Wait for a repair to finish, or reset.`,
        );
        return prev;
      }

      const now = Date.now();
      const next = prev.map((p) =>
        p.id === pageId ? { ...p, status: "corrupted" as const, health: 0, corruptedAt: now } : p,
      );

      // Generate repair symbols
      const newSymbols: RepairSymbol[] = Array.from({ length: 4 }, () => ({
        id: `sym-${symbolIdRef.current++}`,
        fromAngle: Math.random() * 360,
        targetPage: pageId,
        startTime: now,
      }));

      setRepairSymbols((prev) => [...prev, ...newSymbols]);

      // Schedule recovery start
      const recoveryTimer = setTimeout(() => {
        setPages((current) => {
          const p = current[pageId];
          if (p.status !== "corrupted") return current;

          return current.map((pg) =>
            pg.id === pageId
              ? {
                  ...pg,
                  status: "recovering" as const,
                  health: 30,
                  recoveryStart: Date.now(),
                }
              : pg,
          );
        });

        // Schedule recovery progress
        const progressTimer = setTimeout(() => {
          setPages((current) =>
            current.map((pg) =>
              pg.id === pageId && pg.status === "recovering" ? { ...pg, health: 70 } : pg,
            ),
          );
        }, RECOVERY_DURATION_MS * 0.4);
        timersRef.current.set(pageId * 1000 + 1, progressTimer);

        // Schedule recovery complete
        const completeTimer = setTimeout(() => {
          setPages((current) =>
            current.map((pg) =>
              pg.id === pageId && (pg.status === "recovering" || pg.status === "corrupted")
                ? { ...pg, status: "repaired" as const, health: 100 }
                : pg,
            ),
          );

          // Clean up symbols for this page
          setRepairSymbols((current) => current.filter((s) => s.targetPage !== pageId));

          // Clear failure message if everything is recovered
          setPages((current) => {
            const stillBroken = current.filter(
              (p) => p.id !== pageId && (p.status === "corrupted" || p.status === "recovering"),
            ).length;
            if (stillBroken === 0) {
              setFailureMessage(null);
            }
            return current;
          });

          timersRef.current.delete(pageId);
        }, RECOVERY_DURATION_MS);
        timersRef.current.set(pageId * 1000 + 2, completeTimer);
      }, RECOVERY_DELAY_MS);

      timersRef.current.set(pageId, recoveryTimer);

      return next;
    });
  }, []);

  return (
    <VizContainer
      title="RaptorQ Repair, Illustrated"
      status="partial"
      description={
        <>
          A simulation of how <FrankenJargon term="raptorq">RaptorQ fountain codes</FrankenJargon>{" "}
          rebuild lost data. Numbers are illustrative. FrankenSQLite can write RaptorQ repair
          symbols for the WAL today, but its normal recovery path does not use them yet, so
          nothing is repaired automatically.
        </>
      }
      minHeight={480}
    >
      <div className="p-3 md:p-6 space-y-5">
        {/* Top section: Grid + Status */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
          {/* Page Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                Source Pages (K = {TOTAL_PAGES}, illustrative)
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-slate-400 transition-all hover:bg-white/10 hover:border-teal-500/30 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {pages.map((page) => (
                <PageTile
                  key={page.id}
                  page={page}
                  onClick={() => corruptPage(page.id)}
                  repairSymbols={repairSymbols}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-1">
              <LegendItem color="bg-emerald-500" label="Healthy" />
              <LegendItem color="bg-red-500" label="Corrupted" />
              <LegendItem color="bg-blue-400" label="Recovering" />
              <LegendItem color="bg-teal-500" label="Repaired" />
            </div>
          </div>

          {/* Status Panel */}
          <StatusPanel pages={pages} failureMessage={failureMessage} />
        </div>

        {/* Fountain Codes Explainer */}
        <FountainCodesExplainer />

        {/* Toy probability model */}
        <ToyLossModel />
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              A simulation of{" "}
              <FrankenJargon term="raptorq">RaptorQ (RFC 6330) fountain coding</FrankenJargon>. The
              encoder takes K source symbols and computes extra{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>. If some symbols
              are lost, roughly K intact ones, in any mix, are enough to rebuild the rest.
            </div>
            <div>
              What ships today: file-backed connections with a blocking thread pool (the CLI has
              one) write repair symbols for each <FrankenJargon term="wal">WAL</FrankenJargon>{" "}
              commit to a separate <FrankenJargon term="wal-fec">-wal-fec</FrankenJargon> sidecar,
              after the WAL fsync. <code>PRAGMA raptorq_repair_symbols</code> sets how many
              (default 2; 0 turns it off). On Unix, an explicit administrative repair call can use
              the sidecar to rebuild damaged WAL frames. Ordinary opens and crash recovery do not
              read it yet.
            </div>
          </>
        }
        howToUse={
          <>
            <p>
              Click a green page to simulate damage, such as a bad sector. The simulated decoder
              rebuilds it from the surviving pages and the repair symbols.
            </p>
            <div>
              The numbers are illustrative but follow the engine&apos;s repair-budget rule: 16
              source pages at 20% overhead get 4 repair symbols, and 2 of those are held back as
              decode slack, so the budget covers 2 lost pages at once. Damage a third page while two
              are still being repaired and the simulation reports that the budget is exceeded.
            </div>
            <p>
              The toy model below shows why a modest overhead goes a long way when failures are
              independent. Real failures often are not.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Disks and controllers sometimes return bad data, and a checksum can only report that
              something is wrong. SQLite&apos;s WAL frame checksums catch a damaged frame, and
              recovery stops there: that frame and everything after it in the WAL are discarded.
            </p>
            <p>
              Erasure coding adds a way to rebuild the data from a modest amount of extra
              redundancy instead of a full second copy. In FrankenSQLite this is mostly groundwork
              today. Repair symbols are written, and wiring the decoder into ordinary recovery is
              open work. The project does not publish a durability number for it.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-slate-500 font-bold">{label}</span>
    </div>
  );
}
