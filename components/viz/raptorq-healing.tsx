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

const TOTAL_PAGES = 16;
const OVERHEAD_PCT = 20;
const MAX_CORRUPT_BEFORE_FAILURE = Math.floor(TOTAL_PAGES * (OVERHEAD_PCT / 100));
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

/** Compute P(data loss) <= C(K+R, K) * p^(R+1) using log space */
function computeDurability(K: number, p: number, overheadPct: number) {
  const R = Math.floor((overheadPct / 100) * K);
  if (R <= 0 || p <= 0) return { pLoss: 0, nines: Infinity, R };

  // log10 of C(K+R, R) using Stirling-like summation
  // C(K+R, R) = product_{i=1}^{R} (K + i) / i
  let logComb = 0;
  for (let i = 1; i <= R; i++) {
    logComb += Math.log10(K + i) - Math.log10(i);
  }

  const logPLoss = logComb + (R + 1) * Math.log10(p);
  const pLoss = logPLoss < -300 ? 0 : 10 ** logPLoss;
  const nines = logPLoss < -300 ? 300 : -logPLoss;

  return { pLoss, nines, R };
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
        Recovery Status
      </div>

      <div className="space-y-2">
        <StatusRow
          label="Pages corrupted"
          value={`${corrupted}/${TOTAL_PAGES}`}
          color={corrupted > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <StatusRow
          label="Repair symbols"
          value={`${Math.max(0, symbolsAvailable)}`}
          color={symbolsAvailable <= 0 ? "text-red-400" : "text-teal-400"}
        />
        <StatusRow label="Overhead budget" value={`${OVERHEAD_PCT}%`} color="text-slate-300" />
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
              RaptorQ fountain codes repairing corrupted pages...
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
              All pages healthy. Click a page to simulate corruption.
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
      text: "The engine splits page groups into K source symbols. RaptorQ generates R extra repair symbols from those sources. Both are stored alongside the data on disk.",
    },
    {
      title: "Detect",
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
      bgColor: "bg-amber-500/5",
      text: "Every read checksums each page. A failed checksum marks the page as corrupted and triggers the recovery path. No manual intervention required.",
    },
    {
      title: "Reconstruct",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      bgColor: "bg-emerald-500/5",
      text: "As long as any K symbols out of the total K+R survive (any mix of source and repair), RaptorQ solves linear equations over GF(256) to reconstruct the lost data exactly.",
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
/*  Durability Calculator                                              */
/* ------------------------------------------------------------------ */

function DurabilityCalculator() {
  const [K, setK] = useState(10000);
  const [pExp, setPExp] = useState(-4); // log10(p)
  const [overhead, setOverhead] = useState(20);

  const p = 10 ** pExp;

  const { pLoss, nines, R } = useMemo(() => computeDurability(K, p, overhead), [K, p, overhead]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 space-y-4">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500">
        Durability Calculator
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SliderWithLabel
          label="Pages (K)"
          min={100}
          max={100000}
          step={100}
          value={K}
          onChange={setK}
          display={K.toLocaleString()}
        />
        <SliderWithLabel
          label="Corruption prob (p)"
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
          P(loss) &le; C(K+R, K) &times; p^(R+1)
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-600 leading-relaxed">
          <span>
            <strong className="text-slate-400">K</strong> = source data pages in a group
          </span>
          <span>
            <strong className="text-slate-400">R</strong> = extra repair symbols (from overhead %)
          </span>
          <span>
            <strong className="text-slate-400">p</strong> = probability any single page is corrupted
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          K={K.toLocaleString()}, R={R.toLocaleString()}, p={p.toExponential(0)}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-1">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
              P(data loss)
            </div>
            <div className="text-sm font-black text-white tabular-nums">
              {formatExponent(pLoss)}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
              Nines of Durability
            </div>
            <div className="text-sm font-black text-teal-400 tabular-nums">
              {nines >= 300 ? "> 300" : nines.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">
              vs. S3 (11 nines)
            </div>
            <div className="text-sm font-black tabular-nums">
              {nines >= 300 ? (
                <span className="text-teal-400">Far exceeds S3</span>
              ) : nines >= 11 ? (
                <span className="text-teal-400">{(nines / 11).toFixed(1)}x S3</span>
              ) : (
                <span className="text-amber-400">{(nines / 11).toFixed(1)}x S3</span>
              )}
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
          "Insufficient repair symbols -- RaptorQ overhead budget exceeded. Too many simultaneous corruptions to recover.",
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
      title="RaptorQ Self-Healing Demo"
      description={
        <>
          Click database pages to corrupt them and watch{" "}
          <FrankenJargon term="raptorq">RaptorQ fountain codes</FrankenJargon> automatically repair
          the damage. With 20% overhead, up to 3 simultaneous page failures can be recovered.
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
                Database Pages
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

        {/* Durability Calculator */}
        <DurabilityCalculator />
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a simulation of{" "}
              <FrankenJargon term="raptorq">RaptorQ (RFC 6330) Fountain Codes</FrankenJargon>.
              Standard databases rely entirely on the underlying hardware or filesystem (like ZFS)
              to prevent data loss. FrankenSQLite bakes mathematical erasure coding directly into
              the storage engine.
            </div>
            <p>
              For every block of data written, the engine generates extra{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> and stores them
              sequentially in the <FrankenJargon term="wal">WAL</FrankenJargon>.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click on any of the green healthy pages in the grid to simulate a &ldquo;bit
              rot&rdquo; event or bad disk sector.
            </p>
            <div>
              Notice how the engine immediately detects the corruption via checksums, pauses the
              read, grabs the blue{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>, and performs{" "}
              <FrankenJargon term="gf256">GF(256)</FrankenJargon> math to perfectly reconstruct the
              lost <FrankenJargon term="btree">B-tree page</FrankenJargon>. Try corrupting 3 pages
              at once!
            </div>
            <p>
              If you corrupt 4 pages, the recovery fails because the damage exceeded the 20%
              overhead budget.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Silent data corruption occurs regularly at scale. Studies from Google and CERN report
              bit-flip rates of 1 in 10^7 per drive per hour. If a{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> is silently corrupted, a
              standard database will not detect the error until a read encounters the damaged
              sector, potentially weeks later. By that point, backups may also contain the corrupted
              data, and recovery requires hours of downtime replaying a full <code>.sql</code> dump.
            </p>
            <p>
              FrankenSQLite provides mathematical data-loss guarantees by healing corrupted pages in
              microseconds during normal read operations. This gives you ZFS-level enterprise
              durability on any standard filesystem without requiring specialized hardware or a
              replicated storage layer.
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
