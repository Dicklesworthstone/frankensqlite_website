"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { FrankenContainer } from "@/components/franken-elements";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Card 1 — Where unsafe is allowed                                   */
/* ------------------------------------------------------------------ */

const UNSAFE_EXCEPTIONS = [
  { crate: "fsqlite-vfs", reason: "mmap and shared-memory regions" },
  { crate: "fsqlite-c-api", reason: "optional C ABI shim (FFI)" },
] as const;

function UnsafeScopeCard() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <FrankenContainer
      withBolts={false}
      withStitches={false}
      withPulse
      accentColor="#14b8a6"
      className="h-full"
    >
      <div className="flex flex-col items-center justify-center gap-4 p-4 md:p-6 h-full min-h-[200px]">
        <Shield className="h-8 w-8 text-teal-500 opacity-60" />
        <div className="text-center">
          <AnimatedNumber
            value={2}
            duration={800}
            isVisible={isVisible}
            className="text-7xl md:text-8xl font-black text-teal-400 drop-shadow-[0_0_24px_rgba(20,184,166,0.4)]"
          />
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            of 28 workspace crates allow <span className="text-white font-semibold">unsafe</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            ~1.86M lines of Rust under crates/, tests included
          </p>
        </div>
        <ul className="w-full max-w-xs flex flex-col gap-1.5">
          {UNSAFE_EXCEPTIONS.map((ex) => (
            <li
              key={ex.crate}
              className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-md border border-white/10 bg-black/30 px-3 py-1.5"
            >
              <span className="text-[11px] font-mono text-amber-300">{ex.crate}</span>
              <span className="text-[10px] text-slate-500">{ex.reason}</span>
            </li>
          ))}
        </ul>
        <code className="rounded-md border border-teal-500/20 bg-teal-500/5 px-3 py-1.5 text-[11px] font-mono text-teal-400 text-center leading-relaxed">
          [workspace.lints.rust]
          <br />
          unsafe_code = &quot;forbid&quot;
        </code>
      </div>
    </FrankenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 2 — Newtype Safety Demo                                       */
/* ------------------------------------------------------------------ */

/** Real newtypes from crates/fsqlite-types/src (lib.rs, glossary.rs). */
const NEWTYPES = [
  { name: "PageNumber", inner: "NonZeroU32" },
  { name: "TxnId", inner: "NonZeroU64" },
  { name: "CommitSeq", inner: "u64" },
  { name: "PageSize", inner: "u32" },
  { name: "SchemaEpoch", inner: "u64" },
] as const;

function NewtypeSafetyCard() {
  return (
    <FrankenContainer withBolts={false} withStitches={false} className="h-full">
      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <h4 className="text-sm font-black uppercase tracking-[0.15em] text-white">
          Newtype Safety
        </h4>

        {/* Newtype definition */}
        <div className="rounded-lg border border-white/10 bg-black/40 p-2.5">
          <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
            <span className="text-teal-400">pub struct</span> PageNumber(
            <span className="text-amber-300">NonZeroU32</span>);{"\n"}
            <span className="text-teal-400">pub struct</span> TxnId(
            <span className="text-amber-300">NonZeroU64</span>);
          </pre>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Distinct types that compile down to the integer inside. The compiler rejects mixing
            them; there is no runtime cost.
          </p>
        </div>

        {/* Side-by-side code comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          {/* C side */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                C SQLite
              </span>
            </div>
            <pre className="text-xs font-mono text-red-300/90 leading-relaxed whitespace-pre-wrap">
              <span className="text-slate-500">{"// typedefs are aliases: compiles"}</span>
              {"\n"}pgno = txn_id;
            </pre>
            <div className="mt-2 flex items-center gap-1.5 rounded border border-red-500/20 bg-red-500/10 px-2 py-1">
              <X className="h-3 w-3 text-red-400 shrink-0" />
              <span className="text-[10px] font-bold text-red-400">Silent bug</span>
            </div>
          </div>

          {/* Rust side */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                FrankenSQLite
              </span>
            </div>
            <pre className="text-xs font-mono text-emerald-300/90 leading-relaxed whitespace-pre-wrap">
              <span className="text-slate-500">{"// ERROR"}</span>
              {"\n"}pgno = txn_id;
            </pre>
            <div className="mt-2 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
              <span className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                error[E0308]: mismatched types
                <br />
                expected PageNumber, found TxnId
              </span>
            </div>
          </div>
        </div>

        {/* Newtype list */}
        <div className="flex flex-wrap gap-1.5">
          {NEWTYPES.map((nt) => (
            <span
              key={nt.name}
              className="rounded-full border border-teal-500/20 bg-teal-500/5 px-2.5 py-0.5 text-[10px] font-mono font-medium text-teal-400"
            >
              {nt.name}
              <span className="text-slate-500">({nt.inner})</span>
            </span>
          ))}
        </div>
      </div>
    </FrankenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 3 — CVE Prevention Matrix                                     */
/* ------------------------------------------------------------------ */

/**
 * What safe Rust rules out, per bug class. Integer overflow is only partly
 * covered: the engine workspace does not enable `overflow-checks` for release
 * builds, so arithmetic wraps there (defined behavior, but still a wrong value).
 */
const CVE_ROWS = [
  { vuln: "Buffer overflow", rust: "yes", rustReason: "Bounds checks (panic, not overrun)" },
  { vuln: "Use-after-free", rust: "yes", rustReason: "Ownership and borrowing" },
  { vuln: "Double-free", rust: "yes", rustReason: "One owner; Drop runs once" },
  { vuln: "Data race", rust: "yes", rustReason: "Send/Sync checked at compile time" },
  { vuln: "Integer overflow", rust: "partial", rustReason: "No UB, but wraps in release builds" },
] as const;

function CveMatrixCard() {
  return (
    <FrankenContainer withBolts={false} withStitches={false} className="h-full">
      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <h4 className="text-sm font-black uppercase tracking-[0.15em] text-white">
          Bug Classes: C vs Safe Rust
        </h4>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-2 pr-2 md:pr-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Vulnerability
                </th>
                <th className="pb-2 px-2 md:px-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  C
                </th>
                <th className="pb-2 px-2 md:px-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Safe Rust
                </th>
                <th className="pb-2 pl-2 md:pl-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  How
                </th>
              </tr>
            </thead>
            <tbody>
              {CVE_ROWS.map((row, i) => (
                <tr
                  key={row.vuln}
                  className={i < CVE_ROWS.length - 1 ? "border-b border-white/5" : ""}
                >
                  <td className="py-2 pr-2 md:pr-3 text-slate-300 font-medium text-[11px] md:text-xs">
                    {row.vuln}
                  </td>
                  <td className="py-2 px-2 md:px-3 text-center">
                    <X className="h-4 w-4 text-red-500 mx-auto" />
                  </td>
                  <td className="py-2 px-2 md:px-3 text-center">
                    {row.rust === "yes" ? (
                      <Check
                        className="h-4 w-4 text-emerald-500 mx-auto"
                        aria-label="Ruled out"
                      />
                    ) : (
                      <Minus
                        className="h-4 w-4 text-amber-400 mx-auto"
                        aria-label="Partly covered"
                      />
                    )}
                  </td>
                  <td
                    className={`py-2 pl-2 md:pl-3 text-[11px] md:text-xs ${
                      row.rust === "yes" ? "text-teal-400/80" : "text-amber-300/80"
                    }`}
                  >
                    {row.rustReason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Applies to safe Rust. The unsafe code in fsqlite-vfs and fsqlite-c-api is checked by
          review and tests, not by the compiler.
        </p>
      </div>
    </FrankenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 4 — Deadlock Freedom                                          */
/* ------------------------------------------------------------------ */

/** README "Theorem 1: No Page-Ownership Wait Cycles", scoped to page locks. */
const PROOF_STEPS = [
  "try_acquire() never waits",
  "busy → SQLITE_BUSY, no wait edge",
  "no page-lock wait cycle",
  "no page-lock deadlock",
  "QED",
] as const;

function DeadlockFreedomCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <FrankenContainer withBolts={false} withStitches={false} className="h-full">
      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <h4 className="text-sm font-black uppercase tracking-[0.15em] text-white">
          Page Locks Can&apos;t Deadlock
        </h4>

        <div className="flex flex-col gap-3 flex-1 justify-center">
          {PROOF_STEPS.map((step, i) => {
            const isLast = i === PROOF_STEPS.length - 1;
            return (
              <div key={step} className="flex items-center gap-3">
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: prefersReducedMotion ? 0 : 0.4 + i * 0.55,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isLast ? "bg-teal-400" : "bg-teal-500/50"
                    }`}
                  />
                  <span
                    className={`text-sm font-mono leading-relaxed ${
                      isLast ? "text-teal-400 font-black text-base" : "text-slate-300"
                    }`}
                  >
                    {step}
                  </span>
                </motion.div>

                {/* Arrow between steps */}
                {!isLast && (
                  <motion.span
                    initial={prefersReducedMotion ? { opacity: 0.5 } : { opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : 0.6 + i * 0.55,
                      duration: 0.3,
                    }}
                    className="text-teal-500/50 text-xs font-mono"
                    aria-hidden="true"
                  >
                    &rarr;
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Scope: page locks only. Internal mutexes, I/O and lifecycle waits have their own liveness
          checks; this argument does not cover them.
        </p>
      </div>
    </FrankenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Export                                               */
/* ------------------------------------------------------------------ */

export default function SafetyDashboard() {
  return (
    <VizContainer
      title="Safety Dashboard"
      description="What the Rust compiler checks for FrankenSQLite, where the two unsafe exceptions live, and why page locks can't deadlock. Three panels are compile-time checks; the fourth is a property of the engine's lock design."
      minHeight={480}
      status="live"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 md:p-4">
        <UnsafeScopeCard />
        <NewtypeSafetyCard />
        <CveMatrixCard />
        <DeadlockFreedomCard />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              A summary of the safety properties FrankenSQLite gets from Rust and from its own
              design. C gives developers direct control over memory and relies on discipline,
              review and testing to avoid mistakes. Safe Rust rejects many of those mistakes at
              compile time.
            </p>
            <p>
              The unsafe, newtype and bug-class panels are about the compiler. The deadlock panel
              is about how the engine acquires page locks.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Read the <strong>bug-class table</strong>. Buffer overflows, use-after-free,
              double-free and data races can&apos;t happen in safe Rust. Integer overflow is only
              partly covered: it is never undefined behavior in Rust, but the engine&apos;s release
              profile doesn&apos;t enable <code>overflow-checks</code>, so arithmetic wraps instead
              of panicking.
            </p>
            <p>
              Look at the <strong>unsafe panel</strong>. The root <code>Cargo.toml</code> sets{" "}
              <code>unsafe_code = &quot;forbid&quot;</code> for the workspace. Two crates override it
              locally: <code>fsqlite-vfs</code>, which needs raw pointers for mmap and
              shared-memory regions, and the optional <code>fsqlite-c-api</code> FFI shim. If you
              use the Rust crates or the CLI, you never link the C API.
            </p>
            <p>
              Follow the <strong>deadlock argument</strong>. Page-lock acquisition never waits: if
              another transaction holds the page, the caller gets <code>SQLITE_BUSY</code> at once.
              A transaction that isn&apos;t waiting can&apos;t be part of a wait-for cycle, so page
              locks can&apos;t deadlock. The argument covers page locks only.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Memory-safety bugs such as buffer overflows and use-after-free are a recurring class
              of SQLite CVEs. They matter most when the engine handles SQL or database files from
              a source you don&apos;t control.
            </p>
            <div>
              Forbidding <FrankenJargon term="zero-unsafe">unsafe code</FrankenJargon> in 26 of 28
              crates and using the{" "}
              <FrankenJargon term="newtype-pattern">newtype pattern</FrankenJargon> for page
              numbers, transaction IDs and commit sequences removes those classes from most of the
              codebase. The remaining unsafe code sits in two named crates that can be reviewed
              directly. This is not a proof of correctness: logic bugs, panics and integer
              wraparound are still possible, and the test and conformance suites exist to catch
              them.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
