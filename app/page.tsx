"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, ExternalLink, Github, Layers, Package, Rocket } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import ComparisonTable from "@/components/comparison-table";
import FeatureGrid from "@/components/feature-grid";
import { FrankenContainer, StatusBadge } from "@/components/franken-elements";
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
import {
  buildStory,
  changelog,
  codeExample,
  crates,
  engineSnapshot,
  heroStats,
  performanceNote,
  siteConfig,
  statusBoard,
} from "@/lib/content";

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
const WalLanes = dynamic(() => import("@/components/viz/wal-lanes"), {
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
                v{engineSnapshot.version} &middot; SQLite in safe Rust
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
                SQLite, rewritten from scratch in Rust. It opens the database files you already
                have, speaks the same SQL, and lets{" "}
                <FrankenJargon term="mvcc">more than one connection write at a time</FrankenJargon>
                , with <FrankenJargon term="ssi">serializable isolation</FrankenJargon> on by
                default.
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
                  {engineSnapshot.workspaceCrates}
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
          <p className="text-lg text-slate-400 font-medium max-w-3xl">
            Some of this works today and some of it is still on the bench. Each card says which.
            Hover a badge for what it means.
          </p>
        </div>
        <FeatureGrid />
      </div>

      {/* Status board */}
      <section
        id="status"
        aria-labelledby="status-heading"
        className="max-w-7xl mx-auto px-6 mb-32 scroll-mt-28"
      >
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-teal-500/40" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
                As of v{engineSnapshot.version}, {engineSnapshot.releasedOn}
              </span>
            </div>
            <h2
              id="status-heading"
              className="text-3xl md:text-5xl font-black text-white tracking-tighter"
            >
              Where It Stands
            </h2>
          </div>
          <a
            href={engineSnapshot.readmeStatusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-400 hover:text-teal-300"
          >
            Full status in the engine README
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {statusBoard.map((group) => (
            <div
              key={group.status}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-lg font-black text-white">{group.heading}</h3>
                <StatusBadge status={group.status} />
              </div>
              <p className="text-xs text-slate-500 mb-5">{group.blurb}</p>
              <ul className="space-y-4">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <div className="text-sm font-bold text-slate-200">{item.name}</div>
                    <div className="text-xs leading-relaxed text-slate-400 mt-1">{item.detail}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          2. THE PROBLEM — SQLite can only write one thing at a time
          ================================================================ */}
      <SectionShell
        id="the-problem"
        icon="zap"
        eyebrow="The Problem"
        title="One Writer at a Time"
        status="live"
        kicker={
          <>
            SQLite lets many connections read at once, but only one can write. In WAL mode a single
            lock byte (<code>WAL_WRITE_LOCK</code>) decides who that is, and everyone else waits or
            gets <code>SQLITE_BUSY</code>. Add cores and the write path doesn&apos;t get any wider.
            Most apps end up funneling every write through one thread.
            <br />
            <br />
            FrankenSQLite replaces that lock with{" "}
            <FrankenJargon term="mvcc">page-level MVCC</FrankenJargon>. Each writer works against
            its own <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon> and records
            new versions of the pages it changes. Writers on different pages do their work in
            parallel; commit still has a short coordinated step to publish the result. If two
            writers change the same page, the second one to commit gets{" "}
            <code>SQLITE_BUSY_SNAPSHOT</code> and retries. The race below is a simplified picture of
            the difference.
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
        status="live"
        kicker={
          <>
            A transaction starts by taking a{" "}
            <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>: in effect, the
            commit sequence number of the newest commit it is allowed to see. Writers don&apos;t
            overwrite pages other transactions might be reading. They create new versions, so a
            reader keeps seeing the database exactly as it was when it started, and never sees half
            of someone else&apos;s write.
            <br />
            <br />
            The visibility rule is one comparison: a page version committed after your snapshot is
            invisible to you. Click through the tree below to watch{" "}
            <FrankenJargon term="cow">copy-on-write</FrankenJargon> produce new page versions while
            the old tree stays intact for readers that are still using it.
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
        status="live"
        kicker={
          <>
            Every table and index in a SQLite file is a{" "}
            <FrankenJargon term="btree">B-tree</FrankenJargon> made of fixed-size pages, 4 KB by
            default. FrankenSQLite uses exactly the same layout, down to the cell format and varint
            encoding, which is why stock <code>sqlite3</code> can open its files. A lookup walks
            from the root page to a leaf, binary-searching the cells on each page.
            <br />
            <br />
            Pages are also the unit of versioning. A write produces a new version of the leaf it
            touches, plus any pages a split or merge changes, and{" "}
            <FrankenJargon term="mvcc">MVCC</FrankenJargon> decides which transactions can see
            which version. Step through below to watch the read path descend and the write path
            fork.
          </>
        }
      >
        <DeferredViz>
          <BTreePageExplorer />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          5. WHEN CONFLICTS HAPPEN — Write conflict resolution
          ================================================================ */}
      <SectionShell
        id="conflict-resolution"
        icon="gitCompare"
        eyebrow="When Conflicts Happen"
        title="Serializable, Not Just Snapshot"
        status="live"
        kicker={
          <>
            Snapshot isolation alone has a well-known hole called write skew. Two transactions each
            read the same rows, each write a different one, and together they break a rule neither
            broke alone, like two doctors both going off call because each saw the other was on.
            Most MVCC layers for SQLite stop at snapshot isolation. FrankenSQLite doesn&apos;t.
            <br />
            <br />
            At commit, it checks two things. First,{" "}
            <FrankenJargon term="fcw">first-committer-wins</FrankenJargon>: if a page you wrote
            changed since your snapshot, you lose and retry. Second,{" "}
            <FrankenJargon term="ssi">Serializable Snapshot Isolation</FrankenJargon>: it tracks{" "}
            <FrankenJargon term="rw-antidependency">read-write dependencies</FrankenJargon> between
            concurrent transactions and aborts any transaction that would become the pivot of a
            dangerous structure (the{" "}
            <FrankenJargon term="cahill-fekete">Cahill/Fekete rule</FrankenJargon>, applied per
            page). PostgreSQL uses the same idea at row granularity. If you can live with write
            skew, <code>PRAGMA fsqlite.serializable = OFF</code> turns the second check off. The two
            visualizations below show the dependency graph and a commit sequence being validated.
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
          3C. DURABILITY — Write-Ahead Log with per-writer lanes
          ================================================================ */}
      <SectionShell
        id="durability"
        icon="shield"
        eyebrow="Durability"
        title="The Write-Ahead Log"
        status="live"
        kicker={
          <>
            Commits go to the <FrankenJargon term="wal">write-ahead log</FrankenJargon> first: each
            changed page is appended as a frame, and the last frame of a transaction marks the
            commit. If the power goes out halfway through, recovery replays complete transactions
            and ignores the torn tail. A checkpoint later copies frames back into the main file.
            <br />
            <br />
            FrankenSQLite keeps SQLite&apos;s WAL format and its{" "}
            <FrankenJargon term="wal-index">shared-memory WAL index</FrankenJargon>, so a database
            can move between it and stock SQLite after a checkpoint. (Running both engines on the
            same file at the same time is not supported.) With concurrent writers, the
            interesting part is the commit itself: each connection validates and publishes its
            frames inside a short guarded section, so the log stays one ordered sequence even
            though the work that produced it ran in parallel. Use the tabs below to switch between
            normal appends, a checkpoint, and crash recovery.
          </>
        }
      >
        <DeferredViz>
          <WalLanes />
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
        status="live"
        kicker={
          <>
            With concurrent writers, a transaction that runs too long or reads too much hurts
            everyone else: it holds an old{" "}
            <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon> open and raises the
            odds of conflicts. So the engine exposes what its transactions are doing, through
            ordinary PRAGMAs you can query while the workload runs.
            <br />
            <br />
            <code>fsqlite_txn_stats</code> gives lifecycle counters,{" "}
            <code>fsqlite_transactions</code> lists the active ones with their age and read/write
            activity, and <code>fsqlite_txn_advisor</code> flags long transactions, large read sets,
            deep savepoint stacks and rollback pressure against thresholds you can tune.{" "}
            <code>fsqlite_txn_timeline_json</code> returns the same picture as{" "}
            <FrankenJargon term="timeline-profiling">JSON for timeline tools</FrankenJargon>. The
            tabs below show what a healthy and an unhealthy timeline look like.
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
        eyebrow="Safe Rust"
        title="Unsafe in Two Crates, Not Twenty-Eight"
        status="live"
        kicker={
          <>
            SQLite is some of the most heavily tested C in existence, and it still ships the
            occasional memory-safety CVE: buffer overreads, use-after-free, integer overflow into a
            bad allocation. That&apos;s what writing a database in C costs, even with an enormous
            test budget.
            <br />
            <br />
            FrankenSQLite sets <code>unsafe_code = &quot;forbid&quot;</code> for the whole
            workspace. Two crates override it locally: <code>fsqlite-vfs</code>, because mmap and
            shared-memory regions need raw pointers, and the optional <code>fsqlite-c-api</code>,
            because FFI does. The parser, planner, VDBE, B-tree, pager, WAL and MVCC code are safe
            Rust, so those classes of bug can&apos;t appear there.{" "}
            <FrankenJargon term="newtype-pattern">Newtypes</FrankenJargon> for{" "}
            <code>PageNumber</code>, <code>TxnId</code>, <code>PageSize</code> and friends turn
            mixed-up integers into compile errors. Switch to the Rust tab in the newtype demo to see
            the compiler catch a mistake C would accept.
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
          7. FROM SQL TO DISK — Query pipeline flythrough
          ================================================================ */}
      <SectionShell
        id="pipeline"
        icon="terminal"
        eyebrow="From SQL to Disk"
        title="The Query Pipeline"
        status="live"
        kicker={
          <>
            SQL text goes through a hand-written lexer and parser (no Lemon, no generated grammar)
            into a typed AST. Code generation turns that into{" "}
            <FrankenJargon term="vdbe">VDBE bytecode</FrankenJargon>, the same model SQLite uses: a
            small program of opcodes like <code>OpenRead</code>, <code>Rewind</code>,{" "}
            <code>Column</code> and <code>ResultRow</code>, run by a register-based virtual machine
            against the <FrankenJargon term="btree">B-tree</FrankenJargon> layer. FrankenSQLite has
            190+ opcodes.
            <br />
            <br />
            Most table work takes this compiled path today. Some shapes (certain CTEs, views,
            joins and window queries) still run through an interpreted compatibility executor while
            their lowering is finished. Step through the program below to watch the program counter
            advance and rows come out of the opcodes.
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
        title="What the Code Looks Like"
        kicker={
          <>
            <code>Connection</code>, <code>prepare</code>, <code>execute</code>, rows of{" "}
            <code>SqliteValue</code>. The one thing that will look unusual is that every call is
            async: the engine runs on asupersync, so you build a runtime and{" "}
            <code>.await</code> each operation. A <code>Connection</code> stays on the thread that
            opened it; for concurrent writers, open one per thread.{" "}
            <Link
              href="/getting-started"
              className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
            >
              Getting started
            </Link>{" "}
            has the multi-writer version.
          </>
        }
      >
        <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40">
          <RustCodeBlock code={codeExample} title="src/main.rs" />
        </FrankenContainer>
      </SectionShell>

      {/* ================================================================
          ON THE WORKBENCH
          ================================================================ */}
      <section
        id="workbench"
        aria-labelledby="workbench-heading"
        className="relative mx-auto max-w-7xl px-6 pt-24 md:pt-32 scroll-mt-28"
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-amber-400/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300/80">
              On the workbench
            </span>
          </div>
          <h2
            id="workbench-heading"
            className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-6"
          >
            Designed, Built, Not Yet Switched On
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-3xl">
            Everything above runs in the default engine today. The next four sections are the
            ideas FrankenSQLite is best known for, and none of them is fully live yet. Some have
            working, tested code that the commit path doesn&apos;t call; some work only in part;
            one is a design with pieces landing on <code>main</code> every week. Each section says
            exactly where it stands, so you can tell the plan from the product.
          </p>
        </div>
      </section>

      {/* ================================================================
          4. SELF-HEALING STORAGE — RaptorQ fountain codes
          ================================================================ */}
      <SectionShell
        id="self-healing"
        icon="shield"
        eyebrow="Self-Healing Storage"
        title="Repairing the WAL"
        status="partial"
        statusNote={
          <>
            File-backed connections running with a blocking thread pool generate repair symbols
            for durable WAL ranges into a <code>-wal-fec</code> sidecar, in the background
            (<code>PRAGMA raptorq_repair_symbols</code> sets how many). Ordinary recovery still
            stops at the first bad checksum and doesn&apos;t consult them; an explicit{" "}
            <code>repair_and_open</code> API on Unix can.
          </>
        }
        kicker={
          <>
            A torn write or a flipped bit in the WAL can cost you committed transactions. SQLite
            can detect that with frame checksums, but all it can do then is stop replaying at the
            damaged frame.
            <br />
            <br />
            The plan is to store <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>{" "}
            <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> next to the WAL. A
            fountain code turns K source symbols into as many extra symbols as you like, and almost
            any K of them (plus a couple) are enough to rebuild the original. Corrupted frames can
            then be reconstructed during recovery instead of discarded. The demo below shows the
            idea on a handful of pages; the overhead and failure counts in it are illustrative.
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
        eyebrow="Native Mode"
        title="An Append-Only Commit Stream"
        status="design"
        statusNote={
          <>
            Native mode is under construction. Commit capsules, RaptorQ-encoded WAL objects and
            native page groups are landing on <code>main</code>, but there is no stable switch for
            it on <code>Connection</code>. Everything you run today uses standard SQLite files.
          </>
        }
        kicker={
          <>
            SQLite&apos;s files are mutable: pages are overwritten in place, and journals exist to
            make that safe across a crash. Native mode is FrankenSQLite&apos;s longer-term
            alternative. The source of truth becomes an append-only stream of commit capsules,
            each encoded as <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> symbols, and a
            commit exists once its marker is durable. A normal <code>.db</code> file can still be
            produced from the stream for compatibility.
            <br />
            <br />
            The code is <FrankenJargon term="systematic-layout">systematic</FrankenJargon>: the
            original bytes are stored as-is and the{" "}
            <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> sit alongside them,
            so ordinary reads don&apos;t decode anything. Press <strong>Start DB Writers</strong>{" "}
            below for a simplified picture of data and repair symbols streaming to disk.
          </>
        }
      >
        <DeferredViz>
          <EcsStream />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          5B. THE SAFE MERGE LADDER
          ================================================================ */}
      <SectionShell
        id="safe-merge-ladder"
        icon="layers"
        eyebrow="Same-Page Conflicts"
        title="The Safe Merge Ladder"
        status="dormant"
        statusNote={
          <>
            The rebase and patch-merge code lives in <code>fsqlite-mvcc</code> and is exercised by
            tests, but the live commit path doesn&apos;t call it and the intent log isn&apos;t
            populated during writes. Today every same-page conflict is resolved by abort and retry.
          </>
        }
        kicker={
          <>
            Page-level versioning has one obvious weakness: two transactions inserting different
            rows into the same leaf page conflict, even though their changes don&apos;t really
            overlap. Right now the loser gets <code>SQLITE_BUSY_SNAPSHOT</code> and retries.
            <br />
            <br />
            The <FrankenJargon term="safe-merge-ladder">safe merge ladder</FrankenJargon> is the
            planned fix. Each writer keeps a log of what it meant to do at the B-tree level
            (&ldquo;insert rowid 42&rdquo;, &ldquo;delete this index entry&rdquo;). On a same-page
            conflict, the engine first tries to{" "}
            <FrankenJargon term="deterministic-rebase">replay that intent</FrankenJargon> against the
            winner&apos;s version of the page. If that doesn&apos;t apply, it tries a structured
            patch that merges changes cell by cell. Raw byte-level XOR merging is deliberately ruled
            out, because two byte-disjoint edits can still produce an invalid page. Only a conflict
            that survives both rungs aborts. The demo below walks through a merge step by step.
          </>
        }
      >
        <DeferredViz>
          <SafeMergeLadder />
        </DeferredViz>
      </SectionShell>

      {/* ================================================================
          6B. ENCRYPTION AT REST — Page-level encryption pipeline
          ================================================================ */}
      <SectionShell
        id="encryption"
        icon="shield"
        eyebrow="Encryption at Rest"
        title="Page Encryption"
        status="dormant"
        statusNote={
          <>
            Not usable yet. The implementation is in <code>fsqlite-pager</code>, but no{" "}
            <code>PRAGMA key</code> or <code>rekey</code> reaches it. Because unknown PRAGMAs are
            ignored (as in SQLite), <code>PRAGMA key = &apos;...&apos;</code> succeeds and the
            database is still written in plain text.
          </>
        }
        kicker={
          <>
            Encrypting a SQLite database normally means buying SQLite&apos;s commercial SEE
            extension or switching to a fork like SQLCipher. The design here builds it into the
            pager. Each page is encrypted with{" "}
            <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> using a fresh random
            24-byte nonce, and the 16-byte authentication tag lives in the page&apos;s reserved
            bytes.
            <br />
            <br />
            Keys use an <FrankenJargon term="dek-kek">envelope</FrankenJargon>: a random data key
            encrypts the pages, and a key derived from your passphrase with{" "}
            <FrankenJargon term="argon2id">Argon2id</FrankenJargon> encrypts the data key. Changing
            the passphrase re-wraps one 32-byte key instead of rewriting the file. Random nonces
            avoid any global counter, so VM snapshot rollbacks and crashes can&apos;t cause nonce
            reuse. Step through the pipeline below to follow a page through it.
          </>
        }
      >
        <DeferredViz>
          <EncryptionPipeline />
        </DeferredViz>
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
            The closest relative is Turso, another Rust rewrite of SQLite. Its MVCC is opt-in,
            versions rows, and stops at snapshot isolation, so write skew is allowed by design.
            FrankenSQLite versions pages to keep the file format intact, runs concurrent by
            default, and validates for full serializability.
            <br />
            <br />
            Turso is ahead as a product, with bindings, sync and a mature simulation-testing setup.
            C SQLite has 25 years of production use that nothing here can match. DuckDB solves a
            different problem (analytics, columnar storage). The table describes FrankenSQLite as
            it runs today, gaps included.
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
        title={`${engineSnapshot.workspaceCrates} Crates`}
        kicker={
          <>
            Each subsystem is its own crate, and Cargo enforces the boundaries: the parser
            can&apos;t reach into the pager, and the B-tree can&apos;t call the planner. That keeps
            the coupling honest and makes each piece testable on its own.{" "}
            {engineSnapshot.publishedCrates} of the {engineSnapshot.workspaceCrates} are published
            on crates.io, all at the same version. Most applications only need{" "}
            <code>fsqlite</code>, which pulls in the rest.
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
          10B. HOW IT WAS BUILT
          ================================================================ */}
      <SectionShell
        id="how-it-was-built"
        icon="bug"
        eyebrow="Process"
        title="How It Was Built"
        kicker={
          <>
            One person, a lot of coding agents, and eight months. Getting something that mostly
            worked came quickly. Getting it correct under heavy concurrency, and competitive with a
            C codebase tuned for 25 years, did not. Fixing one benchmark kept breaking another.
            These are the habits that finally made progress stick.
          </>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          {buildStory.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-sm font-black text-teal-400">
                  {i + 1}
                </span>
                <h3 className="text-lg font-black text-white">{step.title}</h3>
              </div>
              <div className="text-sm leading-relaxed text-slate-400">{step.body}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-6 md:p-8">
          <h3 className="mb-3 text-lg font-black text-white">{performanceNote.heading}</h3>
          <p className="text-sm leading-relaxed text-slate-400">{performanceNote.body}</p>
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
            From the first commit on {engineSnapshot.firstCommit} to v{engineSnapshot.version}.
            The{" "}
            <a
              href={engineSnapshot.changelogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
            >
              engine changelog
            </a>{" "}
            has the release-by-release detail, known issues included.
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
            Point the <code>fsqlite</code> shell at a database you already have, or add the crate to
            a Rust project. It&apos;s pre-1.0, so try it on something you can afford to break first.
          </div>

          {/* Install command */}
          <div className="mx-auto mt-10 max-w-2xl text-left">
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
              <div className="px-6 py-5 space-y-4 font-mono text-[13px] overflow-x-auto">
                <div>
                  <div className="text-slate-600"># the shell (Linux / macOS)</div>
                  <div className="flex items-start gap-3">
                    <span className="select-none text-teal-500 font-bold">$</span>
                    <code className="text-slate-200 font-bold tracking-tight whitespace-nowrap">
                      curl -fsSL
                      https://raw.githubusercontent.com/Dicklesworthstone/frankensqlite/main/install.sh
                      | bash
                    </code>
                  </div>
                </div>
                <div>
                  <div className="text-slate-600"># the library (nightly Rust)</div>
                  <div className="flex items-start gap-3">
                    <span className="select-none text-teal-500 font-bold">$</span>
                    <code className="text-slate-200 font-bold tracking-tight whitespace-nowrap">
                      cargo add fsqlite &amp;&amp; cargo add asupersync --no-default-features
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Package className="h-3 w-3 text-teal-400" />
              Open source &middot; MIT with OpenAI/Anthropic rider
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
              Who built it
            </div>

            <FrankenGlitch trigger="hover" intensity="low">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight uppercase">
                Built by <br />
                <span className="text-animate-green">Jeffrey Emanuel.</span>
              </h2>
            </FrankenGlitch>

            <p className="mt-6 text-xl text-slate-400 font-medium leading-relaxed max-w-3xl">
              FrankenSQLite is written by coding agents and steered by one person. The tools below
              are what keep many agents working on the same codebase without stepping on
              each other, and they&apos;re all open source.
            </p>
          </div>

          <DeferredViz minHeight={520}>
            <FrankenFlywheel />
          </DeferredViz>

          <div className="mt-20 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-left">
              <p className="text-lg text-slate-400 font-medium leading-relaxed">
                FrankenSQLite is one of the FrankenSuite projects: ground-up Rust rewrites of
                infrastructure people already depend on, including FrankenTUI, FrankenFS,
                FrankenLibC and FrankenEngine. They share a runtime (asupersync), a habit of
                checking themselves against the original, and a lot of the same tooling.
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
                    THE AGENT FLYWHEEL
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
                    MORE PROJECTS
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
                    Built with agents
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
