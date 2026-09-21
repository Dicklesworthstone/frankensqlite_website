"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { FrankenContainer } from "@/components/franken-elements";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Card 1 — Zero Unsafe Counter                                      */
/* ------------------------------------------------------------------ */

function ZeroUnsafeCard() {
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
            value={0}
            duration={800}
            isVisible={isVisible}
            className="text-7xl md:text-8xl font-black text-teal-400 drop-shadow-[0_0_24px_rgba(20,184,166,0.4)]"
          />
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            <span className="text-white font-semibold">unsafe</span> blocks across 26 crates
          </p>
          <p className="text-xs text-slate-500 mt-1">~50,000 lines of Rust</p>
        </div>
        <code className="mt-1 rounded-md border border-teal-500/20 bg-teal-500/5 px-3 py-1.5 text-xs font-mono text-teal-400">
          #[forbid(unsafe_code)]
        </code>
      </div>
    </FrankenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 2 — Newtype Safety Demo                                       */
/* ------------------------------------------------------------------ */

const NEWTYPES = ["PageNumber", "TxnId", "CommitSeq", "PageSize", "SchemaEpoch"] as const;

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
            <span className="text-amber-300">u32</span>);{"\n"}
            <span className="text-teal-400">pub struct</span> TxnId(
            <span className="text-amber-300">u64</span>);
          </pre>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Distinct types. The compiler rejects mixing them at zero runtime cost.
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
              <span className="text-slate-500">{"// compiles fine!"}</span>
              {"\n"}pgno = txn_id;
            </pre>
            <div className="mt-2 flex items-center gap-1.5 rounded border border-red-500/20 bg-red-500/10 px-2 py-1">
              <X className="h-3 w-3 text-red-400 shrink-0" />
              <span className="text-[10px] font-bold text-red-400">Silent Bug</span>
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
              key={nt}
              className="rounded-full border border-teal-500/20 bg-teal-500/5 px-2.5 py-0.5 text-[10px] font-mono font-medium text-teal-400"
            >
              {nt}
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

const CVE_ROWS = [
  { vuln: "Buffer overflow", rustReason: "Bounds checking" },
  { vuln: "Use-after-free", rustReason: "Ownership system" },
  { vuln: "Double-free", rustReason: "Drop semantics" },
  { vuln: "Data race", rustReason: "Send/Sync traits" },
  { vuln: "Integer overflow", rustReason: "Checked arithmetic" },
] as const;

function CveMatrixCard() {
  return (
    <FrankenContainer withBolts={false} withStitches={false} className="h-full">
      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <h4 className="text-sm font-black uppercase tracking-[0.15em] text-white">
          CVE Prevention Matrix
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
                  Rust
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
                    <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-2 pl-2 md:pl-3 text-teal-400/80 text-[11px] md:text-xs">
                    {row.rustReason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FrankenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 4 — Deadlock Freedom                                          */
/* ------------------------------------------------------------------ */

const PROOF_STEPS = [
  "try_acquire() never blocks",
  "no wait-for edges",
  "no cycles",
  "no deadlock",
  "QED",
] as const;

function DeadlockFreedomCard() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <FrankenContainer withBolts={false} withStitches={false} className="h-full">
      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <h4 className="text-sm font-black uppercase tracking-[0.15em] text-white">
          Deadlock Freedom
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
      title="Safety Guarantee Dashboard"
      description="Four compile-time guarantees that eliminate memory-safety and concurrency bugs before the code ever runs. No runtime overhead, no escape hatches."
      minHeight={480}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 md:p-4">
        <ZeroUnsafeCard />
        <NewtypeSafetyCard />
        <CveMatrixCard />
        <DeadlockFreedomCard />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a dashboard of static analysis guarantees. The C language gives
              developers total control over memory but expects perfect discipline. Rust uses strict
              mathematical rules to enforce memory safety.
            </p>
            <p>
              These four panels highlight exactly how the Rust compiler prevents the most common
              database vulnerabilities at compile time, before the engine is even allowed to
              execute.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Read the <strong>CVE Prevention Matrix</strong> to see how 70% of historical SQLite
              security vulnerabilities (Buffer Overflows, Use-After-Free) are structurally
              impossible in safe Rust.
            </p>
            <p>
              Observe the <strong>Zero Unsafe</strong> block. In Rust, you can bypass the compiler
              using the <code>unsafe</code> keyword. FrankenSQLite strictly forbids this across all
              26 crates, meaning there are no hidden &ldquo;escape hatches.&rdquo;
            </p>
            <p>
              Check the <strong>Deadlock Freedom</strong> mathematical proof. By never allowing a
              transaction to block on a lock (it either acquires it instantly or aborts), the engine
              creates a graph with no wait-for edges, proving that deadlocks are impossible.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Legacy databases written in C are susceptible to memory-safety vulnerabilities
              including buffer overflows, use-after-free, and data races. These account for roughly
              70% of the CVEs filed against SQLite. In network-exposed deployments, a crafted SQL
              query exploiting a buffer overflow can lead to remote code execution or unauthorized
              data exfiltration.
            </p>
            <div>
              By enforcing <FrankenJargon term="zero-unsafe">Zero Unsafe</FrankenJargon> invariants
              and using the <FrankenJargon term="newtype-pattern">newtype pattern</FrankenJargon>{" "}
              for type-level domain separation, FrankenSQLite eliminates entire classes of CVEs at
              compile time, allowing you to run untrusted queries with confidence that the engine
              cannot exhibit undefined behavior.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
