"use client";

import { Cpu, Database, HardDrive, Layers, Shield, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import FrankenGlitch from "@/components/franken-glitch";
import { FrankenJargon } from "@/components/franken-jargon";
import FrankenMermaidDiagram from "@/components/frankenmermaid-diagram";
import { architectureLayers, crates } from "@/lib/content";

const VersionChainExplorer = dynamic(() => import("@/components/viz/version-chain-explorer"), {
  ssr: false,
});
const RaptorQHealing = dynamic(() => import("@/components/viz/raptorq-healing"), { ssr: false });
const ConflictLadder = dynamic(() => import("@/components/viz/conflict-ladder"), { ssr: false });
const EcsFormat = dynamic(() => import("@/components/viz/ecs-format"), { ssr: false });
const XorDeltaChain = dynamic(() => import("@/components/viz/xor-delta-chain"), { ssr: false });
const BocpdRegime = dynamic(() => import("@/components/viz/bocpd-regime"), { ssr: false });
const SheafConsistency = dynamic(() => import("@/components/viz/sheaf-consistency"), {
  ssr: false,
});
const VarintEncoding = dynamic(() => import("@/components/viz/varint-encoding"), { ssr: false });
const ArcEviction = dynamic(() => import("@/components/viz/arc-eviction"), { ssr: false });
const WriteCoordinator = dynamic(() => import("@/components/viz/write-coordinator"), {
  ssr: false,
});
const WalIndexShm = dynamic(() => import("@/components/viz/wal-index-shm"), { ssr: false });
const ConformalCalibration = dynamic(() => import("@/components/viz/conformal-calibration"), {
  ssr: false,
});
const EprocessMonitor = dynamic(() => import("@/components/viz/eprocess-monitor"), { ssr: false });
const MazurkiewiczTraces = dynamic(() => import("@/components/viz/mazurkiewicz-traces"), {
  ssr: false,
});
const StorageModes = dynamic(() => import("@/components/viz/storage-modes"), { ssr: false });

const iconMap: Record<string, typeof Cpu> = {
  layers: Layers,
  hardDrive: HardDrive,
  shield: Shield,
  database: Database,
  zap: Zap,
  cpu: Cpu,
};

export default function ArchitecturePage() {
  return (
    <main id="main-content" className="relative">
      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-8">
            <Cpu className="h-3 w-3" />
            System_Architecture
          </div>
          <FrankenGlitch trigger="always" intensity="low">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
              Architecture
            </h1>
          </FrankenGlitch>
          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            A 26-crate layered workspace where every module is independently testable, versioned,
            and documented. Six architectural layers from foundation to integration.
          </p>
        </div>
      </section>

      {/* ARCHITECTURE DIAGRAM — FrankenMermaid WASM */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <FrankenMermaidDiagram />
        </div>
      </section>

      {/* LAYER DESCRIPTIONS */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-12">
            Architectural Layers
          </h2>

          <div className="space-y-8">
            {architectureLayers.map((layer) => {
              const Icon = iconMap[layer.iconName] ?? Layers;
              return (
                <div
                  key={layer.name}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:border-teal-500/20 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                      <Icon className={`h-6 w-6 ${layer.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{layer.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {layer.crates.map((c) => (
                          <span
                            key={c}
                            className="text-[9px] font-mono font-bold text-teal-500/70 bg-teal-500/5 px-2 py-0.5 rounded-full border border-teal-500/10"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{layer.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MVCC DEEP DIVE */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-8">
            MVCC Deep Dive
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h3 className="text-lg font-black text-white mb-4">Snapshot Isolation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Each transaction captures a{" "}
                <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon> of the database at
                its start time: a consistent, frozen view of all{" "}
                <FrankenJargon term="btree">B-tree pages</FrankenJargon>. Writers create{" "}
                <FrankenJargon term="cow">copy-on-write</FrankenJargon> versions of modified pages
                and merge them at commit time via{" "}
                <FrankenJargon term="fcw">First-Committer-Wins</FrankenJargon>. Readers are never
                blocked and never see uncommitted data.
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h3 className="text-lg font-black text-white mb-4">Concurrent Writers</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                C SQLite allows exactly one writer at a time. FrankenSQLite supports up to 8
                concurrent writers operating on their own{" "}
                <FrankenJargon term="snapshot-isolation">snapshots</FrankenJargon>. The{" "}
                <FrankenJargon term="mvcc">MVCC</FrankenJargon> layer manages version chains for
                each page, and background garbage collection reclaims versions that are no longer
                visible to any active transaction, keeping memory bounded.
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h3 className="text-lg font-black text-white mb-4">Time-Travel Queries</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                <FrankenJargon term="time-travel">Time-travel queries</FrankenJargon> let you
                inspect the database at any past commit point using{" "}
                <code className="text-teal-300 text-xs">FOR SYSTEM_TIME AS OF</code> with a commit
                sequence number or timestamp. Because{" "}
                <FrankenJargon term="mvcc">MVCC</FrankenJargon> version chains preserve old page
                states, the engine can reconstruct any historical{" "}
                <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon> on demand. No
                forks, no replicas, no manual backup rotation required.
              </p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h3 className="text-lg font-black text-white mb-4">Version Cleanup</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                A background vacuum reclaims space from{" "}
                <FrankenJargon term="mvcc">MVCC</FrankenJargon> versions no longer visible to any
                active transaction.{" "}
                <FrankenJargon term="bocpd">BOCPD regime detection</FrankenJargon> monitors
                throughput patterns in real time and auto-tunes garbage collection thresholds when
                the workload shifts between OLTP bursts, bulk loads, and idle periods. No manual
                tuning required.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <VersionChainExplorer />
          </div>
        </div>
      </section>

      {/* WRITE COORDINATOR */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Single-Threaded Write Coordinator
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            Multi-threaded disk I/O typically requires complex locking protocols and two-phase
            commit. FrankenSQLite takes a different approach: slow{" "}
            <FrankenJargon term="btree">B-tree</FrankenJargon> modifications run in parallel across
            many worker threads, but the actual commit validation and{" "}
            <FrankenJargon term="wal">WAL</FrankenJargon> appends are funneled through a single,
            lock-free <FrankenJargon term="write-coordinator">Write Coordinator</FrankenJargon>{" "}
            pipeline. This maximizes sequential SSD write bandwidth while avoiding the contention
            that plagues mutex-based commit paths.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            The visualization below shows worker threads producing{" "}
            <FrankenJargon term="mvcc">MVCC</FrankenJargon> page diffs in parallel, then feeding
            them through the coordinator&apos;s validation,{" "}
            <FrankenJargon term="wal">WAL</FrankenJargon> append, and flush stages. Press{" "}
            <strong>Run Pipeline</strong> to watch the pipeline in action.
          </p>

          <WriteCoordinator />
        </div>
      </section>

      {/* THE SAFE MERGE LADDER */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            The Safe Merge Ladder
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            When two transactions modify the same{" "}
            <FrankenJargon term="btree">B-tree page</FrankenJargon>, most databases abort one
            immediately. FrankenSQLite&apos;s{" "}
            <FrankenJargon term="safe-merge-ladder">Safe Merge Ladder</FrankenJargon> tries four
            progressively stronger resolution strategies before resorting to abort. Each rung
            handles a wider class of conflicts than the one above it. The conflict ladder
            visualization below lets you walk through three scenarios, from non-conflicting to true
            conflict, and see exactly which rung resolves each case.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 mb-12">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-400 text-sm font-black">
                  1
                </span>
                <h3 className="text-sm font-black text-white">Intent Replay</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <FrankenJargon term="deterministic-rebase">Deterministic rebase</FrankenJargon>:
                replay the intent log against the updated snapshot. Works when all expressions are
                deterministic (no RANDOM, no CURRENT_TIME).
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 text-sm font-black">
                  2
                </span>
                <h3 className="text-sm font-black text-white">
                  <FrankenJargon term="foata">FOATA Merge</FrankenJargon>
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Canonical reordering of independent operations. If two writes don&apos;t interfere,
                they can be merged into a single consistent result.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 text-sm font-black">
                  3
                </span>
                <h3 className="text-sm font-black text-white">
                  <FrankenJargon term="xor-delta">XOR Delta Merge</FrankenJargon>
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Byte-level diff combination. If the two deltas don&apos;t overlap at the byte level,
                their XOR produces a valid merged page.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 text-sm font-black">
                  4
                </span>
                <h3 className="text-sm font-black text-white">Abort</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only as a last resort. The losing transaction is rolled back and retried. This is
                the only strategy that matches traditional database behavior.
              </p>
            </div>
          </div>

          <ConflictLadder />
        </div>
      </section>

      {/* RAPTORQ DURABILITY */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-8">
            RaptorQ Self-Healing
          </h2>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 md:p-12 mb-12">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
                  Encode
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Every time a <FrankenJargon term="btree">B-tree page</FrankenJargon> is written,{" "}
                  <FrankenJargon term="raptorq">RaptorQ fountain codes</FrankenJargon> generate
                  redundant <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> over{" "}
                  <FrankenJargon term="gf256">GF(256)</FrankenJargon> arithmetic. These symbols are
                  stored sequentially alongside the data in the{" "}
                  <FrankenJargon term="wal">WAL</FrankenJargon> with configurable overhead
                  (typically 20%).
                </p>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
                  Detect
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  On every page read, BLAKE3 checksums verify integrity. If corruption is detected,
                  whether from bit rot, disk controller errors, or cosmic rays, the recovery
                  pipeline activates automatically with no operator intervention.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
                  Recover
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  <FrankenJargon term="inactivation-decoding">Inactivation decoding</FrankenJargon>{" "}
                  reconstructs corrupted data from the surviving{" "}
                  <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>. The peeling
                  decoder handles most cases; <FrankenJargon term="gf256">GF(256)</FrankenJargon>{" "}
                  Gaussian elimination finishes the rest. Recovery requires just 2 extra symbols
                  beyond the source block count. Click pages below to simulate corruption and watch
                  the engine rebuild them.
                </p>
              </div>
            </div>
          </div>

          <RaptorQHealing />
        </div>
      </section>

      {/* ERASURE-CODED STREAMS */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Erasure-Coded Streams
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            The <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon> format is
            FrankenSQLite&apos;s native storage mode. It replaces the traditional in-place update
            model with an append-only sequence of{" "}
            <FrankenJargon term="content-addressed">content-addressed</FrankenJargon> page versions,
            each protected by <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>{" "}
            <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            The <FrankenJargon term="systematic-layout">systematic layout</FrankenJargon> places raw
            source data first in every block, so normal reads are zero-copy with no decoding
            overhead. Decoding activates only when corruption is detected. Step through the
            visualization below to see how a raw 4 KB page is partitioned into source symbols,
            encoded with <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>, and then recovered
            after simulated corruption.
          </p>

          <EcsFormat />
        </div>
      </section>

      {/* COMPACT VERSION STORAGE */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Compact Version Storage
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            <FrankenJargon term="mvcc">MVCC</FrankenJargon> version chains grow with every write.
            Storing a full 4 KB copy of a <FrankenJargon term="btree">B-tree page</FrankenJargon>{" "}
            for every single transaction would bloat the database rapidly.{" "}
            <FrankenJargon term="xor-delta">XOR deltas</FrankenJargon> compress these chains by
            storing only the bytes that actually changed between successive page versions.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            When less than 25% of a page changes (the common case for point updates), the engine
            stores a sparse delta instead of a full copy, saving up to 93% of storage per version.
            When a page changes substantially, a full snapshot is stored and the delta chain resets.
            Step through below to see the XOR computation, the sparse delta, and the threshold-based
            cutoff in action.
          </p>

          <XorDeltaChain />
        </div>
      </section>

      {/* ARC CACHE */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Adaptive Replacement Cache
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            A single <code>SELECT *</code> table scan can evict the entire LRU working set, forcing
            the buffer pool to re-read frequently-accessed pages from disk. FrankenSQLite replaces
            LRU with an <FrankenJargon term="mvcc">MVCC</FrankenJargon>-aware{" "}
            <FrankenJargon term="arc-cache">Adaptive Replacement Cache (ARC)</FrankenJargon>: four
            lists (T1 for recent, T2 for frequent, B1 and B2 as ghost lists tracking recently
            evicted metadata) that self-tune based on access patterns.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            On top of ARC, the{" "}
            <FrankenJargon term="cooling-protocol">Cooling Protocol</FrankenJargon> adds a grace
            period: pages must survive an entire cooling cycle without being re-accessed before they
            become eviction candidates. Hot <FrankenJargon term="btree">B-tree</FrankenJargon>{" "}
            interior nodes use{" "}
            <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> to resolve
            in-memory addresses directly, bypassing the cache lookup entirely. The result:
            sequential scans no longer destroy your working set. Try accessing pages below to see
            how the four lists interact and how ghost lists influence future promotion decisions.
          </p>

          <ArcEviction />
        </div>
      </section>

      {/* VARINT ENCODING */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Varint Encoding
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            SQLite compresses row IDs, record header sizes, and serial types using{" "}
            <FrankenJargon term="varint">Varint Encoding</FrankenJargon>: a Huffman-optimal,
            prefix-free code where small integers (the common case) use just 1 byte and the largest
            use 9. This saves substantial space across millions of records because most integers in
            a database are small.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite replicates this encoding exactly, byte for byte, maintaining full
            read/write compatibility with existing <code>.sqlite3</code> files. Drag the slider
            below to watch how integers of different magnitudes map to different byte widths, and
            compare the varint representation against a fixed 8-byte layout.
          </p>

          <VarintEncoding />
        </div>
      </section>

      {/* SHEAF THEORY */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Sheaf-Theoretic Consistency
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            In multi-process and high-concurrency settings, pairwise consistency checks miss a
            dangerous class of bugs: cases where no two transactions disagree with each other, yet
            the global state is inconsistent. Standard testing misses these because it only compares
            pairs.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite&apos;s conformance harness uses a{" "}
            <FrankenJargon term="sheaf-theoretic">sheaf-theoretic consistency model</FrankenJargon>{" "}
            to detect exactly these anomalies. Each transaction&apos;s local view (its
            &ldquo;section&rdquo; in the sheaf) must be globally compatible; if the sections cannot
            be glued into a single consistent state, the harness flags the violation. Step through
            below to see three transaction views tested for global consistency.
          </p>

          <SheafConsistency />
        </div>
      </section>

      {/* BOCPD REGIME DETECTION */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Adaptive Workload Regimes
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            Static thresholds for <FrankenJargon term="mvcc">MVCC</FrankenJargon> garbage collection
            and page compaction are inevitably wrong for at least one workload pattern. A threshold
            tuned for OLTP bursts wastes resources during idle periods; one tuned for bulk loads
            stalls under point-query traffic.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite uses{" "}
            <FrankenJargon term="bocpd">
              Bayesian Online Change-Point Detection (BOCPD)
            </FrankenJargon>{" "}
            to detect workload regime shifts in real time. The algorithm maintains a running
            posterior over &ldquo;run length&rdquo; (how long the current regime has lasted) and
            triggers re-tuning when it detects a statistically significant shift. Start the live
            telemetry below, then switch between workload regimes to watch the detector identify
            transitions between OLTP, bulk-load, and idle throughput patterns.
          </p>

          <BocpdRegime />
        </div>
      </section>

      {/* EXHAUSTIVE VERIFICATION */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Exhaustive Concurrency Verification
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            Testing concurrent code with random fuzzing leaves you hoping you hit the right thread
            schedule. With N threads and M operations each, the number of possible interleavings
            grows factorially. Random sampling covers a vanishing fraction of the space.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite uses{" "}
            <FrankenJargon term="mazurkiewicz-trace">Mazurkiewicz traces</FrankenJargon> to group
            thread schedules that differ only in the ordering of independent (non-conflicting)
            operations into equivalence classes. Then{" "}
            <FrankenJargon term="dpor">Dynamic Partial-Order Reduction (DPOR)</FrankenJargon> tests
            exactly one schedule per class. This turns an infinite state space into a finite,
            exhaustively provable set. Step through below to see how three raw interleavings
            collapse into two equivalence classes, and why testing one representative from each
            class is sufficient.
          </p>

          <MazurkiewiczTraces />
        </div>
      </section>

      {/* E-PROCESS MONITORING */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Anytime-Valid Invariant Monitoring
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            Traditional unit tests run once and stop. If a concurrency bug only manifests after 10
            billion operations, a fixed test suite will never find it. Running more tests increases
            false-positive rates unless you apply Bonferroni correction, which reduces statistical
            power.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite continuously monitors runtime invariants (like strict <code>TxnId</code>{" "}
            monotonicity and <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>{" "}
            ordering) using <FrankenJargon term="e-process">e-processes</FrankenJargon>. Because
            they are mathematically anytime-valid martingales, they can run for billions of
            operations without false-positive inflation, halting the engine the millisecond an
            invariant violation occurs. Press <strong>Run E-Process Monitor</strong> below to watch
            the e-value accumulate under normal operations, then see it spike through the rejection
            threshold when a violation is injected.
          </p>

          <EprocessMonitor />
        </div>
      </section>

      {/* CONFORMAL CALIBRATION */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Conformal Performance Bounds
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            Benchmark latency distributions have heavy tails, bimodal modes, and regime-dependent
            shapes. Reporting mean ± standard deviation assumes normality, which is almost never
            true. The result: regressions hide inside wide error bars, and improvements look
            significant when they are just noise.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite uses{" "}
            <FrankenJargon term="conformal-prediction">conformal prediction</FrankenJargon> to
            establish rigorous, distribution-free confidence intervals around performance metrics.
            These bounds hold regardless of the underlying distribution, catching regressions that
            parametric methods miss. The visualization below shows how conformal intervals adapt to
            the actual data shape, tightening in stable regimes and widening during transitions.
          </p>

          <ConformalCalibration />
        </div>
      </section>

      {/* LOCK-FREE WAL INDEX */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Lock-Free WAL Index
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            When <FrankenJargon term="mvcc">MVCC</FrankenJargon> writers continuously append new
            page versions to the <FrankenJargon term="wal">WAL</FrankenJargon>, readers need a fast
            way to find the most recent version of any page without blocking writers. A sequential
            scan of the WAL would be O(N); a tree-based index would require locks on every update.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            FrankenSQLite solves this with a memory-mapped{" "}
            <FrankenJargon term="wal-index">WAL Index</FrankenJargon> stored in the{" "}
            <code>-shm</code> shared memory file. It is a flat hash table using open addressing and
            linear probing with a load factor strictly capped at 0.5. Lookups resolve in O(1)
            expected time without a single lock acquisition or system call. Type a page number below
            and watch the hash function probe the table to find the WAL frame offset.
          </p>

          <WalIndexShm />
        </div>
      </section>

      {/* STORAGE MODES */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            Storage Modes
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-4 max-w-3xl">
            FrankenSQLite supports two storage modes. Compatibility mode reads and writes standard{" "}
            <code>.sqlite3</code> files, so you can drop FrankenSQLite into an existing application
            with zero migration effort. Your data stays in the format every SQLite tool already
            understands.
          </p>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8 max-w-3xl">
            Native <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon> mode trades
            additional disk space for built-in <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>{" "}
            self-healing, <FrankenJargon term="content-addressed">content-addressed</FrankenJargon>{" "}
            page versions, and append-only crash safety. Step through the comparison below to see
            how the same write operation flows through each mode and where they diverge.
          </p>

          <StorageModes />
        </div>
      </section>

      {/* FULL CRATE LIST */}
      <section className="py-16 pb-32">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-12">
            All 26 Crates
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {crates.map((crate) => (
              <div
                key={crate.name}
                className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-teal-500/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Layers className="h-4 w-4 text-teal-500/60 group-hover:text-teal-400 transition-colors" />
                  <span className="text-xs font-black text-white font-mono tracking-tight">
                    {crate.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{crate.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
