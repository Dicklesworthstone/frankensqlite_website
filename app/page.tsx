"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, ExternalLink, Github, Layers, Package, Rocket } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import ComparisonTable from "@/components/comparison-table";
import FeatureGrid from "@/components/feature-grid";
import { FrankenContainer } from "@/components/franken-elements";
import FrankenEye from "@/components/franken-eye";
import FrankenGlitch from "@/components/franken-glitch";
import { FrankenJargon } from "@/components/franken-jargon";
import GlowOrbits from "@/components/glow-orbits";
import { BorderBeam, Magnetic } from "@/components/motion-wrapper";
import RustCodeBlock from "@/components/rust-code-block";
import SectionShell from "@/components/section-shell";
import StatsGrid from "@/components/stats-grid";
import Timeline from "@/components/timeline";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { changelog, codeExample, crates, heroStats, siteConfig } from "@/lib/content";

// Loading skeleton for dynamically imported viz components
function VizSkeleton() {
  return (
    <div
      className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8 animate-pulse"
      style={{ minHeight: 400 }}
    >
      <div className="h-4 w-32 bg-white/5 rounded mb-3" />
      <div className="h-6 w-48 bg-white/5 rounded mb-6" />
      <div className="h-64 bg-white/[0.03] rounded-xl" />
    </div>
  );
}

function DeferredViz({
  children,
  minHeight = 400,
}: {
  children: React.ReactNode;
  minHeight?: number;
}) {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.01,
    rootMargin: "600px 0px",
    triggerOnce: true,
  });

  return (
    <div ref={ref}>
      {isIntersecting ? (
        children
      ) : (
        <div style={{ minHeight }}>
          <VizSkeleton />
        </div>
      )}
    </div>
  );
}

// Lazy-load visualizations — these are heavy client components
const MvccRace = dynamic(() => import("@/components/viz/mvcc-race"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const CowBtree = dynamic(() => import("@/components/viz/cow-btree"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const BTreePageExplorer = dynamic(() => import("@/components/viz/btree-page-explorer"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const LearnedIndex = dynamic(() => import("@/components/viz/learned-index"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const DatabaseCracking = dynamic(() => import("@/components/viz/database-cracking"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const WalLanes = dynamic(() => import("@/components/viz/wal-lanes"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const CoolingProtocol = dynamic(() => import("@/components/viz/cooling-protocol"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const RaptorQHealing = dynamic(() => import("@/components/viz/raptorq-healing"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const SsiValidation = dynamic(() => import("@/components/viz/ssi-validation"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const SafeMergeLadder = dynamic(() => import("@/components/viz/safe-merge-ladder"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const EcsStream = dynamic(() => import("@/components/viz/ecs-stream"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const VdbeBytecode = dynamic(() => import("@/components/viz/vdbe-bytecode"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const SafetyDashboard = dynamic(() => import("@/components/viz/safety-dashboard"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const EncryptionPipeline = dynamic(() => import("@/components/viz/encryption-pipeline"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const TimelineProfiler = dynamic(() => import("@/components/viz/timeline-profiler"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const WitnessPlane = dynamic(() => import("@/components/viz/witness-plane"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const NewtypePattern = dynamic(() => import("@/components/viz/newtype-pattern"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const FrankenMermaidDiagram = dynamic(() => import("@/components/frankenmermaid-diagram"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});
const FrankenFlywheel = dynamic(() => import("@/components/franken-flywheel"), {
  ssr: false,
  loading: () => <VizSkeleton />,
});

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <main id="main-content">
      {/* ================================================================
          1. LIVING HERO
          ================================================================ */}
      <section className="relative flex flex-col items-center pt-24 pb-32 overflow-hidden text-left">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[100px]" />
          <GlowOrbits />
        </div>

        <div className="relative z-10 mx-auto max-w-screen-2xl px-6 lg:px-8 w-full mt-12 md:mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left column — text */}
            <div className="lg:col-span-6 flex flex-col items-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-8"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
                26-Crate Workspace &middot; Pure Safe Rust
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(3.5rem,10vw,7rem)] font-black tracking-tight leading-[0.85] text-white mb-10 text-left"
              >
                The <br />
                <span className="text-red-500">Monster</span> <br />
                Database Engine.
              </motion.h1>

              <div className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl mb-12">
                A clean-room Rust reimplementation of SQLite with{" "}
                <FrankenJargon term="mvcc">concurrent writers</FrankenJargon>,{" "}
                <FrankenJargon term="raptorq">self-healing storage</FrankenJargon>, and{" "}
                <FrankenJargon term="zero-unsafe">zero unsafe blocks</FrankenJargon> across 26
                composable crates.
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                <Magnetic strength={0.1}>
                  <Link
                    href="/getting-started"
                    data-magnetic="true"
                    className="relative px-10 py-5 rounded-2xl bg-teal-500 text-black font-black text-lg hover:bg-white transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(20,184,166,0.3)] active:scale-95"
                  >
                    <span className="absolute inset-0 rounded-2xl animate-pulse bg-teal-400/20" />
                    <Rocket className="relative h-5 w-5" />
                    <span className="relative">GET STARTED</span>
                  </Link>
                </Magnetic>
                <Magnetic strength={0.1}>
                  <a
                    href={siteConfig.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-magnetic="true"
                    className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Github className="h-5 w-5" />
                    VIEW SOURCE
                  </a>
                </Magnetic>
              </div>
            </div>

            {/* Right column — Frankenstein illustration */}
            <div className="lg:col-span-6 relative max-w-md mx-auto lg:max-w-none">
              {/* Teal glow backdrop */}
              <div className="absolute -inset-12 bg-teal-500/15 rounded-[2rem] blur-[80px]" />

              <motion.div
                animate={prefersReducedMotion ? undefined : { y: [0, -12, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <FrankenContainer
                  withBolts={true}
                  accentColor="#14b8a6"
                  className="relative overflow-hidden"
                >
                  <Image
                    src="/images/frankensqlite_illustration.webp"
                    alt="FrankenSQLite monster illustration"
                    width={800}
                    height={800}
                    className="block w-full h-auto"
                    priority
                  />
                  {/* Scanline overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20" />
                </FrankenContainer>
              </motion.div>

              {/* FrankenEye decoration */}
              <div className="absolute -top-6 -right-2 md:-top-8 md:-right-4 z-20 animate-bounce transition-all duration-1000">
                <FrankenEye className="scale-100 md:scale-150 rotate-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
              </div>
            </div>
          </div>

          {/* Architecture Diagram Preview — FrankenMermaid WASM */}
          <div className="relative mt-20 w-full max-w-[1200px] mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-teal-400 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative">
              <BorderBeam />
              <FrankenMermaidDiagram />
            </div>

            <div className="absolute -bottom-6 left-4 md:-bottom-10 md:left-6 z-30 glass-modern p-4 md:p-6 rounded-2xl border border-teal-500/20 shadow-2xl animate-float flex">
              <div className="flex flex-col text-left">
                <span className="text-2xl md:text-4xl font-black text-teal-400 tabular-nums tracking-tighter">
                  26
                </span>
                <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Workspace Crates
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero stats */}
      <div className="max-w-7xl mx-auto px-6 mb-20">
        <StatsGrid stats={heroStats} />
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 mb-32">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">
            What Makes It Different
          </h2>
          <p className="text-lg text-slate-400 font-medium">
            Concurrent writers, self-healing pages, and compiler-enforced safety, built into the
            engine, not bolted on.
          </p>
        </div>
        <FeatureGrid />
      </div>

      {/* ================================================================
          2. THE PROBLEM — SQLite can only write one thing at a time
          ================================================================ */}
      <SectionShell
        id="the-problem"
        icon="zap"
        eyebrow="The Problem"
        title="One Writer at a Time"
        kicker={
          <>
            Production SQLite applications hit one wall repeatedly: <code>SQLITE_BUSY</code>. The
            engine acquires a single global write lock, so every concurrent writer queues behind it,
            one at a time, no exceptions. Under load, you either retry in a loop or serialize your
            entire write path through a single thread.
            <br />
            <br />
            FrankenSQLite eliminates this bottleneck. Its{" "}
            <FrankenJargon term="mvcc">page-level MVCC</FrankenJargon> gives each writer a private{" "}
            <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon> of only the pages it
            touches. Eight writers proceed in parallel, operating on different pages simultaneously,
            with zero lock contention and zero <code>SQLITE_BUSY</code> errors. The race below shows
            exactly what that difference looks like under load.
          </>
        }
      >
        <MvccRace />
      </SectionShell>

      {/* ================================================================
          3. HOW IT WORKS — MVCC Version Chains
          ================================================================ */}
      <SectionShell
        id="how-it-works"
        icon="layers"
        eyebrow="How It Works"
        title="Snapshot Isolation"
        kicker={
          <>
            When a transaction begins, FrankenSQLite captures a{" "}
            <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>: a frozen-in-time view
            of every page in the database. Readers see exactly the state that existed at their start
            time. Writers create new <FrankenJargon term="cow">copy-on-write</FrankenJargon> page
            versions without touching the originals, so readers are never blocked and never see
            partial writes.
            <br />
            <br />
            The visibility rule fits in a single line of code: if a page version&apos;s commit
            sequence number is higher than your snapshot&apos;s, you cannot see it. This one
            invariant is what makes the entire <FrankenJargon term="mvcc">MVCC</FrankenJargon>{" "}
            system correct. Click through the tree below to watch{" "}
            <FrankenJargon term="cow">copy-on-write</FrankenJargon> create new page versions while
            the original tree stays intact for concurrent readers.
          </>
        }
      >
        <DeferredViz>
          <CowBtree />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          3B. PHYSICAL LAYOUT — B-Tree pages and Copy-on-Write
          ================================================================ */}
      <SectionShell
        id="physical-layout"
        icon="layers"
        eyebrow="Physical Layout"
        title="Pages All the Way Down"
        kicker={
          <>
            Every table, index, and row lives inside 4 KB{" "}
            <FrankenJargon term="btree">B-tree pages</FrankenJargon>. A read operation
            binary-searches from root to leaf; hot interior nodes use{" "}
            <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> to resolve
            in-memory addresses directly, skipping the page cache entirely.
            <br />
            <br />
            Writes never modify the original page. Instead, the engine creates a{" "}
            <FrankenJargon term="cow">shadow copy</FrankenJargon>, applies the mutation to the copy,
            and re-links parent pointers upward through the tree. Chain enough shadow copies
            together and you get <FrankenJargon term="mvcc">MVCC</FrankenJargon>: multiple page
            versions coexisting without conflict, each visible only to the transactions that should
            see them. Step through the visualization below to watch the read path descend and the
            write path fork.
          </>
        }
      >
        <DeferredViz>
          <BTreePageExplorer />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          3C. ADVANCED INDEXING — Learned Indexes
          ================================================================ */}
      <SectionShell
        id="learned-index"
        icon="zap"
        eyebrow="Machine Learning"
        title="Learned Indexes"
        kicker={
          <>
            Every <FrankenJargon term="btree">B-tree</FrankenJargon> lookup costs O(log N) random
            memory jumps, root to internal to leaf, one potential cache miss per level. On a
            million-row table, that means roughly 20 pointer chases per point query.
            <br />
            <br />
            FrankenSQLite can replace this traversal with a{" "}
            <FrankenJargon term="learned-index">Learned Index</FrankenJargon>: a compact
            mathematical model trained on the actual key distribution. It predicts where a key lives
            on disk in O(1) time, one multiplication instead of twenty random reads. The model
            retrains incrementally as data changes, so it stays accurate without manual
            intervention. Click a query button below to see the model predict a key&apos;s location,
            then compare the result against a traditional tree walk.
          </>
        }
      >
        <DeferredViz>
          <LearnedIndex />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          3D. ADVANCED INDEXING — Database Cracking
          ================================================================ */}
      <SectionShell
        id="database-cracking"
        icon="activity"
        eyebrow="Adaptive Layout"
        title="Database Cracking"
        kicker={
          <>
            Traditional indexes require upfront decisions: which columns, what order, at what
            write-amplification cost. Get it wrong and queries stay slow. Get it right and you pay
            the cost of building the index before the first query benefits.
            <br />
            <br />
            <FrankenJargon term="database-cracking">Database Cracking</FrankenJargon> inverts this
            entirely. The first range query on a column physically partitions the data in-place as a
            side effect of answering the query. The second query refines that partition. Each
            subsequent query tightens the physical layout toward exactly the access pattern your
            application produces, with zero DBA intervention and zero upfront cost. Run the three
            queries below and watch the array reorganize itself after each one.
          </>
        }
      >
        <DeferredViz>
          <DatabaseCracking />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          3E. PAGE CACHE — Cooling Protocol
          ================================================================ */}
      <SectionShell
        id="cooling-protocol"
        icon="monitor"
        eyebrow="Buffer Pool"
        title="The Cooling Protocol"
        kicker={
          <>
            A single <code>SELECT *</code> table scan can destroy a standard LRU buffer pool. Every
            sequentially-read page pushes out a frequently-accessed hot page that will be needed
            again milliseconds later. The result: cache miss storms, I/O spikes, and latency cliffs
            under mixed workloads.
            <br />
            <br />
            FrankenSQLite&apos;s{" "}
            <FrankenJargon term="cooling-protocol">Cooling Protocol</FrankenJargon> prevents this. A
            state machine governs eviction: pages transition through Hot, Cooling, and Cold states.
            Only pages that survive an entire cooling cycle without a single re-access become
            eviction candidates. Hot <FrankenJargon term="btree">B-tree</FrankenJargon> interior
            nodes use <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> to
            bypass the page cache lookup entirely. Try clicking pages below to re-heat them, then
            run a background scan to watch the cooling cycle in action.
          </>
        }
      >
        <DeferredViz>
          <CoolingProtocol />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          3C. DURABILITY — Write-Ahead Log with per-writer lanes
          ================================================================ */}
      <SectionShell
        id="durability"
        icon="shield"
        eyebrow="Durability"
        title="The Write-Ahead Log"
        kicker={
          <>
            Every committed transaction writes its changes to the{" "}
            <FrankenJargon term="wal">Write-Ahead Log</FrankenJargon> before they reach the main
            database file. If power fails mid-write, the main file is untouched; uncommitted{" "}
            <FrankenJargon term="wal">WAL</FrankenJargon> frames are simply discarded on recovery.
            <br />
            <br />
            Standard SQLite serializes all writes through a single WAL writer. FrankenSQLite gives
            each writer its own lane via the{" "}
            <FrankenJargon term="write-coordinator">Write Coordinator</FrankenJargon>, and readers
            locate the most recent version of any page through a lock-free{" "}
            <FrankenJargon term="wal-index">WAL index</FrankenJargon> in shared memory. Use the tabs
            below to switch between Normal mode (live write appends), Checkpoint mode (flushing WAL
            frames back to the main file), and Crash Recovery (discarding uncommitted data after a
            simulated crash).
          </>
        }
      >
        <DeferredViz>
          <WalLanes />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          4. SELF-HEALING STORAGE — RaptorQ fountain codes
          ================================================================ */}
      <SectionShell
        id="self-healing"
        icon="shield"
        eyebrow="Self-Healing Storage"
        title="Corruption-Proof Pages"
        kicker={
          <>
            Bit rot is silent, cumulative, and inevitable. A single flipped bit in a{" "}
            <FrankenJargon term="btree">B-tree</FrankenJargon> interior node can corrupt an entire
            subtree of rows. Standard SQLite relies entirely on external tools (ZFS checksums,
            periodic backups, manual <code>PRAGMA integrity_check</code>) to detect and repair this
            damage after the fact.
            <br />
            <br />
            FrankenSQLite builds recovery directly into the storage engine.{" "}
            <FrankenJargon term="raptorq">RaptorQ fountain codes</FrankenJargon> generate{" "}
            <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> for every data page
            at write time. When corruption is detected on read, whether from bit rot, disk error, or
            cosmic ray,{" "}
            <FrankenJargon term="inactivation-decoding">inactivation decoding</FrankenJargon>{" "}
            reconstructs the original bytes from the surviving symbols. No backup restore. No
            operator intervention. Automatic recovery, guaranteed within the configured overhead
            budget. Click the healthy pages below to simulate corruption and watch the engine
            reconstruct them in real time.
          </>
        }
      >
        <DeferredViz>
          <RaptorQHealing />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          4B. NATIVE STORAGE FORMAT — Erasure Coded Stream
          ================================================================ */}
      <SectionShell
        id="ecs-stream"
        icon="hardDrive"
        eyebrow="Storage Engine"
        title="Append-Only Durability"
        kicker={
          <>
            The native <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon> format
            rethinks how a database file is physically structured. Instead of overwriting pages
            in-place (which requires careful journaling to avoid corruption on crash), it
            continuously appends new <FrankenJargon term="cow">page versions</FrankenJargon> to the
            end of a log, interleaved with <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>{" "}
            <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>.
            <br />
            <br />
            The <FrankenJargon term="systematic-layout">systematic layout</FrankenJargon> places raw
            source data first in each block, so normal reads are zero-copy with no decoding overhead
            at all. The repair symbols sit alongside, inert until corruption is detected. You get
            append-only crash safety and self-healing durability in a single file format. Press{" "}
            <strong>Start DB Writers</strong> below to watch data pages and repair symbols stream to
            disk, then click a page to corrupt it and observe automatic recovery.
          </>
        }
      >
        <DeferredViz>
          <EcsStream />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          5. WHEN CONFLICTS HAPPEN — Write conflict resolution
          ================================================================ */}
      <SectionShell
        id="conflict-resolution"
        icon="gitCompare"
        eyebrow="When Conflicts Happen"
        title="Smart Conflict Resolution"
        kicker={
          <>
            Most concurrent writes land on different{" "}
            <FrankenJargon term="btree">B-tree pages</FrankenJargon> and merge without effort. The
            interesting case is when two transactions touch the same page. FrankenSQLite inspects
            cell-level write sets: if the changed cells don&apos;t overlap, the engine merges them
            automatically without aborting either transaction.
            <br />
            <br />
            When cells do overlap,{" "}
            <FrankenJargon term="ssi">Serializable Snapshot Isolation</FrankenJargon> guarantees
            correctness. The engine maintains a{" "}
            <FrankenJargon term="witness-plane">Witness Plane</FrankenJargon>, a live dependency
            graph that detects dangerous{" "}
            <FrankenJargon term="rw-antidependency">read-write anti-dependencies</FrankenJargon>{" "}
            using the <FrankenJargon term="cahill-fekete">Cahill-Fekete</FrankenJargon> cycle
            detection rule. If a cycle forms, the pivot transaction is aborted. If no cycle exists,
            both transactions commit. <FrankenJargon term="fcw">First-Committer-Wins</FrankenJargon>{" "}
            ensures the outcome is deterministic and fair. Step through the two visualizations below
            to see the Witness Plane build its graph and SSI validate a commit sequence.
          </>
        }
      >
        <div className="flex flex-col gap-8">
          <DeferredViz>
            <WitnessPlane />
          </DeferredViz>
          <DeferredViz>
            <SsiValidation />
          </DeferredViz>
        </div>
      </SectionShell>

      {/* ================================================================
          5B. THE SAFE MERGE LADDER
          ================================================================ */}
      <SectionShell
        id="safe-merge-ladder"
        icon="layers"
        eyebrow="Automatic Resolution"
        title="The Safe Merge Ladder"
        kicker={
          <>
            C SQLite&apos;s answer to a write conflict is a single error code:{" "}
            <code>SQLITE_BUSY</code>. The application retries, hopes for the best, and accepts the
            throughput hit.
            <br />
            <br />
            FrankenSQLite&apos;s{" "}
            <FrankenJargon term="safe-merge-ladder">Safe Merge Ladder</FrankenJargon> tries four
            strategies in descending order of confidence before giving up. First:{" "}
            <FrankenJargon term="deterministic-rebase">intent replay</FrankenJargon>, re-executing
            the transaction&apos;s operation log against the updated{" "}
            <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>. Second:{" "}
            <FrankenJargon term="foata">FOATA reordering</FrankenJargon>, finding a canonical merge
            of operations that are mathematically independent. Third: byte-level{" "}
            <FrankenJargon term="xor-delta">XOR delta</FrankenJargon> merge, combining
            non-overlapping byte changes on the same page. Only when all three strategies fail does
            the engine abort and retry, which is the same behavior other databases start with as
            their only option. Step through below to watch the XOR delta merge resolve a conflict
            that would have caused <code>SQLITE_BUSY</code> in standard SQLite.
          </>
        }
      >
        <DeferredViz>
          <SafeMergeLadder />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          5C. OBSERVABILITY
          ================================================================ */}
      <SectionShell
        id="observability"
        icon="activity"
        eyebrow="Observability"
        title="Transaction Telemetry"
        kicker={
          <>
            Debugging slow transactions in C SQLite means guessing. <code>EXPLAIN QUERY PLAN</code>{" "}
            shows the plan, not the execution. There is no built-in way to see where wall-clock time
            actually goes inside a running transaction.
            <br />
            <br />
            FrankenSQLite&apos;s native{" "}
            <FrankenJargon term="timeline-profiling">Timeline Profiler</FrankenJargon> records the
            exact microsecond of every operation: <code>BEGIN</code>, each read, each write,
            savepoints, rollbacks, and <code>COMMIT</code>. It emits Chrome DevTools-compatible JSON
            traces for visual inspection and actively flags anti-patterns, including long-held{" "}
            <FrankenJargon term="snapshot-isolation">snapshots</FrankenJargon>, excessive rollbacks,
            and lock contention, before they reach production. Switch between the Healthy and
            Anti-Pattern tabs below to see what clean and pathological transaction timelines look
            like.
          </>
        }
      >
        <DeferredViz>
          <TimelineProfiler />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          6. PURE SAFE RUST — Safety guarantees dashboard
          ================================================================ */}
      <SectionShell
        id="safety"
        icon="shield"
        eyebrow="Pure Safe Rust"
        title="Zero Unsafe Blocks"
        kicker={
          <>
            C SQLite has shipped CVEs for buffer overflows, use-after-free, NULL pointer
            dereferences, and type confusion bugs. These are structural consequences of writing
            150,000+ lines of C without memory safety guarantees. Code review and fuzzing reduce the
            rate; they cannot eliminate the category.
            <br />
            <br />
            FrankenSQLite has <FrankenJargon term="zero-unsafe">zero unsafe blocks</FrankenJargon>{" "}
            across all 26 crates. <code>#[forbid(unsafe_code)]</code> on every crate makes buffer
            overflows, use-after-free, and data races impossible at compile time.{" "}
            <FrankenJargon term="newtype-pattern">Newtypes</FrankenJargon> wrap every ID type (
            <code>PageNo</code>, <code>TxnId</code>, <code>FrameNo</code>) so the compiler rejects
            category confusion at build time, not at 3 AM in production. The dashboard below shows
            the safety guarantees; switch to the Rust tab in the newtype demo to see the compiler
            catch a type mix-up that C would silently accept.
          </>
        }
      >
        <div className="flex flex-col gap-8">
          <DeferredViz>
            <SafetyDashboard />
          </DeferredViz>
          <DeferredViz>
            <NewtypePattern />
          </DeferredViz>
        </div>
      </SectionShell>

      {/* ================================================================
          6B. ENCRYPTION AT REST — Page-level encryption pipeline
          ================================================================ */}
      <SectionShell
        id="encryption"
        icon="shield"
        eyebrow="Encryption at Rest"
        title="Every Page, Locked Down"
        kicker={
          <>
            <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> encrypts each 4 KB{" "}
            <FrankenJargon term="btree">B-tree page</FrankenJargon> independently with a unique
            nonce. The <FrankenJargon term="dek-kek">DEK/KEK envelope</FrankenJargon> separates the
            data encryption key from the key-encryption key, so changing the user passphrase rewraps
            a single key rather than re-encrypting billions of pages. The page number is bound into
            the <FrankenJargon term="aead">AEAD</FrankenJargon> authenticated data field, which
            means an attacker cannot swap ciphertext between page slots; the integrity check rejects
            it before decryption even begins.
            <br />
            <br />
            Key derivation uses <FrankenJargon term="argon2id">Argon2id</FrankenJargon>, a
            memory-hard KDF that resists GPU and ASIC brute-force attacks. Encryption is built into
            the storage layer, not bolted on as a paid extension. Step through the pipeline below to
            follow a plaintext page from passphrase derivation through nonce generation, AEAD
            encryption, and authenticated verification.
          </>
        }
      >
        <DeferredViz>
          <EncryptionPipeline />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          7. FROM SQL TO DISK — Query pipeline flythrough
          ================================================================ */}
      <SectionShell
        id="pipeline"
        icon="terminal"
        eyebrow="From SQL to Disk"
        title="The Query Pipeline"
        kicker={
          <>
            A SQL string enters FrankenSQLite&apos;s hand-written recursive descent parser, with no
            Yacc, no generated code, and full control over error messages and recovery. The query
            planner transforms the AST into a cost-based execution plan. The code generator compiles
            that plan into <FrankenJargon term="vdbe">VDBE bytecode</FrankenJargon>: a compact
            program of low-level opcodes that the virtual machine executes instruction by
            instruction against the <FrankenJargon term="btree">B-tree</FrankenJargon> storage
            layer.
            <br />
            <br />
            Every stage lives in a separate crate with its own tests and version number. Swap the
            parser, keep the <FrankenJargon term="btree">B-tree</FrankenJargon> engine. Replace the
            planner, keep the <FrankenJargon term="vdbe">VDBE</FrankenJargon>. This is what 26
            composable crates buy you. Step through the bytecode execution below: watch the program
            counter advance, registers fill, and rows materialize from opcodes.
          </>
        }
      >
        <DeferredViz>
          <VdbeBytecode />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          8. THE CODE — Familiar API, Monster Power
          ================================================================ */}
      <SectionShell
        id="code"
        icon="terminal"
        eyebrow="The Code"
        title="Familiar API, Monster Power"
        kicker={
          <>
            A complete database operation in 28 lines. The API surface is what Rust developers
            expect: <code>Connection</code>, <code>Statement</code>, <code>Row</code>. Everything
            described on this page, <FrankenJargon term="mvcc">MVCC</FrankenJargon> concurrency,{" "}
            <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> self-healing,{" "}
            <FrankenJargon term="aead">page-level encryption</FrankenJargon>,{" "}
            <FrankenJargon term="ssi">serializable isolation</FrankenJargon>, works transparently
            beneath this interface. You write standard SQL and get the safety of Rust, the
            concurrency of a server-grade database, and the simplicity of an embedded engine.
          </>
        }
      >
        <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40">
          <RustCodeBlock code={codeExample} title="examples/quickstart.rs" />
        </FrankenContainer>
      </SectionShell>

      {/* ================================================================
          9. HOW IT COMPARES — Engine Comparison
          ================================================================ */}
      <SectionShell
        id="comparison"
        icon="gitCompare"
        eyebrow="How It Compares"
        title="Engine Comparison"
        kicker={
          <>
            <FrankenJargon term="mvcc">Concurrent writers</FrankenJargon>,{" "}
            <FrankenJargon term="raptorq">self-healing storage</FrankenJargon>, and{" "}
            <FrankenJargon term="aead">encryption at rest</FrankenJargon> are all built into
            FrankenSQLite&apos;s engine from the ground up. C SQLite requires paid add-ons (SEE for
            encryption, session extension for replication) or external infrastructure for any of
            these. libSQL adds concurrent writers but not self-healing. DuckDB brings analytical
            concurrency but targets a different workload. FrankenSQLite combines concurrent{" "}
            <FrankenJargon term="mvcc">MVCC</FrankenJargon> writers,{" "}
            <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> error correction,{" "}
            <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> encryption, and{" "}
            <FrankenJargon term="zero-unsafe">zero unsafe code</FrankenJargon> in a single,
            composable engine.
          </>
        }
      >
        <ComparisonTable />
      </SectionShell>

      {/* ================================================================
          10. 26-CRATE WORKSPACE
          ================================================================ */}
      <SectionShell
        id="crates"
        icon="blocks"
        eyebrow="Workspace"
        title="26 Composable Crates"
        kicker={
          <>
            Every architectural layer is a separate Rust crate with its own test suite, version
            number, and documentation. Need just the{" "}
            <FrankenJargon term="sql-dialect">SQL parser</FrankenJargon>? Depend on{" "}
            <code>fsqlite-parser</code>. Need the <FrankenJargon term="btree">B-tree</FrankenJargon>{" "}
            engine without the query layer? Depend on <code>fsqlite-btree</code>. Need{" "}
            <FrankenJargon term="mvcc">MVCC</FrankenJargon> concurrency? Add{" "}
            <code>fsqlite-mvcc</code>. Each crate compiles independently, so downstream projects
            pull in only the layers they need, nothing more.
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {crates.map((crate, i) => (
            <motion.div
              key={crate.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
              className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-teal-500/20 hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3 mb-2">
                <Layers className="h-4 w-4 text-teal-500/60 group-hover:text-teal-400 transition-colors" />
                <span className="text-xs font-black text-white font-mono tracking-tight">
                  {crate.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{crate.description}</p>
            </motion.div>
          ))}
        </div>
      </SectionShell>

      {/* ================================================================
          11. DEVELOPMENT TIMELINE
          ================================================================ */}
      <SectionShell
        id="timeline"
        icon="clock"
        eyebrow="Development Timeline"
        title="The Build Log"
        kicker={
          <>
            Five phases from foundation types to a full{" "}
            <FrankenJargon term="sql-dialect">SQL engine</FrankenJargon> with{" "}
            <FrankenJargon term="mvcc">MVCC</FrankenJargon> concurrency,{" "}
            <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> self-healing, and a complete
            extension ecosystem. Each phase builds on the crates established in the one before it,
            maintaining <FrankenJargon term="zero-unsafe">zero unsafe code</FrankenJargon>{" "}
            throughout.
          </>
        }
      >
        <Timeline items={changelog} />
      </SectionShell>

      {/* ================================================================
          12. GET STARTED CTA
          ================================================================ */}
      <section className="relative overflow-hidden py-28 md:py-36 lg:py-44">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/20 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-900/60 bg-gradient-to-br from-teal-950/80 to-teal-900/50 text-teal-400 shadow-lg shadow-teal-900/10">
              <Rocket className="h-6 w-6" />
            </div>
          </div>

          <FrankenGlitch trigger="hover" intensity="medium">
            <h2 className="font-bold tracking-tighter text-white text-4xl md:text-6xl">
              Ready to Build?
            </h2>
          </FrankenGlitch>

          <div className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 md:text-xl font-medium">
            Add FrankenSQLite to your Rust project with a single <code>cargo add</code>. Concurrent
            writers, self-healing pages, and full SQL support from your first commit.
          </div>

          {/* Install command */}
          <div className="mx-auto mt-10 max-w-md">
            <div className="glow-green overflow-hidden rounded-2xl border border-teal-500/20 bg-black/60 shadow-xl shadow-teal-950/30">
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-teal-500/60" />
                </div>
                <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                  terminal
                </span>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 font-mono text-sm">
                  <span className="select-none text-teal-500 font-bold">$</span>
                  <code className="text-slate-200 font-bold tracking-tight">cargo add fsqlite</code>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Package className="h-3 w-3 text-teal-400" />
              MIT License &middot; Free &amp; Open Source
            </div>

            <Magnetic strength={0.1}>
              <Link
                href="/getting-started"
                data-magnetic="true"
                className="glow-green group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-teal-900/30 transition-all hover:from-teal-500 hover:to-teal-400 hover:shadow-teal-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020a05]"
              >
                <Rocket className="h-5 w-5" />
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ================================================================
          12. AUTHOR CREDIT
          ================================================================ */}
      <section className="relative py-32 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-16 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-8">
              <Activity className="h-3 w-3" />
              Origin_Protocol
            </div>

            <FrankenGlitch trigger="hover" intensity="low">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight uppercase">
                Crafted by <br />
                <span className="text-animate-green">Jeffrey Emanuel.</span>
              </h2>
            </FrankenGlitch>

            <p className="mt-6 text-xl text-slate-400 font-medium leading-relaxed max-w-3xl">
              This entire system was architected and built using the
              <strong className="text-white"> AI Flywheel</strong>, an interactive ecosystem of
              specialized autonomous agents.
            </p>
          </div>

          <DeferredViz minHeight={520}>
            <FrankenFlywheel />
          </DeferredViz>

          <div className="mt-20 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-left">
              <p className="text-lg text-slate-400 font-medium leading-relaxed">
                FrankenSQLite is part of the FrankenSuite, a family of Rust infrastructure projects
                including FrankenTUI, FrankenSQLite, and more. Each one pushes the boundaries of
                what safe Rust can achieve.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Magnetic strength={0.2}>
                  <a
                    href="https://agent-flywheel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-magnetic="true"
                    className="px-8 py-4 rounded-2xl bg-teal-500 text-black font-black text-sm hover:bg-white transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(20,184,166,0.2)]"
                  >
                    EXPLORE FLYWHEEL
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Magnetic>
                <Magnetic strength={0.1}>
                  <a
                    href={siteConfig.social.authorGithub}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-magnetic="true"
                    className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <Github className="h-4 w-4" />
                    AUTHOR_CORE
                  </a>
                </Magnetic>
              </div>
            </div>

            {/* Visual Side - Illustration */}
            <div className="relative group" style={{ perspective: "1000px" }}>
              <motion.div
                whileHover={{
                  rotateY: -10,
                  rotateX: 5,
                  scale: 1.02,
                  boxShadow: "0 20px 80px -20px rgba(20, 184, 166, 0.3)",
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl transition-all"
              >
                <Image
                  src="/images/frankensqlite_illustration.webp"
                  alt="FrankenSQLite Origin"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20" />

                <div className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/5">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">
                    Flywheel_Generated
                  </span>
                </div>
              </motion.div>

              <div className="absolute -inset-4 bg-teal-500/10 rounded-[2rem] blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
