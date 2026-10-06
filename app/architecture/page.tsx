"use client";

import { Cpu, Database, HardDrive, Layers, Shield, Zap } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  BUILD_STATUS,
  type BuildStatus,
  StatusBadge,
} from "@/components/franken-elements";
import FrankenGlitch from "@/components/franken-glitch";
import { FrankenJargon } from "@/components/franken-jargon";
import FrankenMermaidDiagram from "@/components/frankenmermaid-diagram";
import { architectureLayers, crates, engineSnapshot } from "@/lib/content";

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
const LearnedIndex = dynamic(() => import("@/components/viz/learned-index"), { ssr: false });
const DatabaseCracking = dynamic(() => import("@/components/viz/database-cracking"), {
  ssr: false,
});
const CoolingProtocol = dynamic(() => import("@/components/viz/cooling-protocol"), {
  ssr: false,
});

const iconMap: Record<string, typeof Cpu> = {
  layers: Layers,
  hardDrive: HardDrive,
  shield: Shield,
  database: Database,
  zap: Zap,
  cpu: Cpu,
};

/** Where each topic on this page stands in the engine (see engineSnapshot). */
const STATUS = {
  mvcc: "live",
  timeTravel: "partial",
  writeCoordinator: "design",
  walIndex: "live",
  pageCache: "live",
  varint: "live",
  mergeLadder: "dormant",
  raptorq: "partial",
  ecs: "design",
  xorDelta: "dormant",
  storageModes: "partial",
  learnedIndex: "dormant",
  cracking: "dormant",
  cooling: "dormant",
  bocpd: "harness",
  sheaf: "harness",
  dpor: "harness",
  eprocess: "harness",
  conformal: "opt-in",
} satisfies Record<string, BuildStatus>;

const inlineCode = "text-teal-300 text-xs";

function Topic({
  id,
  title,
  status,
  children,
}: {
  id: string;
  title: string;
  status?: BuildStatus;
  children: ReactNode;
}) {
  return (
    <section id={id} className="py-16 scroll-mt-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{title}</h2>
          {status && <StatusBadge status={status} />}
        </div>
        {children}
      </div>
    </section>
  );
}

function Prose({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return (
    <p
      className={`text-lg text-slate-400 font-medium leading-relaxed max-w-3xl ${last ? "mb-8" : "mb-4"}`}
    >
      {children}
    </p>
  );
}

function GroupDivider({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-6 pt-24 pb-4">
      <div className="inline-flex items-center gap-3 mb-4">
        <div className="h-px w-8 bg-teal-500/40" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">{title}</h2>
      <p className="text-base text-slate-500 leading-relaxed max-w-3xl">{children}</p>
    </div>
  );
}

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
            v{engineSnapshot.version} internals
          </div>
          <FrankenGlitch trigger="always" intensity="low">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
              Architecture
            </h1>
          </FrankenGlitch>
          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            How the {engineSnapshot.workspaceCrates} crates fit together, how concurrent writers
            actually work, and which of the more ambitious ideas are running today versus still on
            the bench. Every section is labeled.
          </p>
          <div className="mt-8 flex flex-col gap-2">
            {(Object.keys(BUILD_STATUS) as BuildStatus[]).map((status) => (
              <span key={status} className="inline-flex items-center gap-3 text-xs text-slate-500">
                <StatusBadge status={status} className="min-w-[8.5rem] justify-center" />
                <span>{BUILD_STATUS[status].hint}</span>
              </span>
            ))}
          </div>
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
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
            The Layers
          </h2>
          <Prose last>
            Each layer is one or more crates, and Cargo enforces the direction of dependencies. The
            parser can&apos;t reach into the pager, and the B-tree can&apos;t call the planner.
          </Prose>

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
                  <div className="text-sm text-slate-400 leading-relaxed">{layer.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          CONCURRENCY
          ================================================================ */}
      <GroupDivider eyebrow="Running today" title="Concurrency">
        The part of FrankenSQLite that is both new and live: many writers in one process, with
        serializable isolation.
      </GroupDivider>

      <Topic id="mvcc" title="MVCC, Page by Page" status={STATUS.mvcc}>
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <h3 className="text-lg font-black text-white mb-4">Snapshots</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every transaction reads from a{" "}
              <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>, identified by the
              highest commit sequence number it may see. Writers produce new page versions instead
              of overwriting ones a reader might be using, so readers never block and never see a
              half-finished write.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <h3 className="text-lg font-black text-white mb-4">Concurrent writers</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Plain <code className={inlineCode}>BEGIN</code> is promoted to{" "}
              <code className={inlineCode}>BEGIN CONCURRENT</code>. There is no fixed writer cap;
              open one connection per thread. A writer locks a page the first time it writes it,
              and if another transaction holds it, the call fails fast instead of waiting. No
              waiting means no wait-for cycles, so page locks can&apos;t deadlock.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <h3 className="text-lg font-black text-white mb-4">Commit</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Statement execution and private page changes overlap freely. Commit takes a short
              registry guard, runs <FrankenJargon term="fcw">first-committer-wins</FrankenJargon>{" "}
              and <FrankenJargon term="ssi">SSI</FrankenJargon> validation, writes through the
              pager, and publishes the result to the commit index. The loser of a same-page race
              gets <code className={inlineCode}>SQLITE_BUSY_SNAPSHOT</code>.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <h3 className="text-lg font-black text-white mb-4">Cleaning up versions</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Versions older than the oldest snapshot anyone still holds can go. The engine keeps
              the newest version of each page at or below that horizon, retires the rest, and frees
              them in batches with epoch-based reclamation once no reader can be looking at them.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-6 mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h3 className="text-base font-black text-white">Time-travel queries</h3>
            <StatusBadge status={STATUS.timeTravel} />
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            <code className={inlineCode}>SELECT ... FOR SYSTEM_TIME AS OF COMMITSEQ n</code> (or a
            timestamp) works on <code className={inlineCode}>:memory:</code> databases, which keep
            a ring of up to 256 snapshots taken at each commit. File-backed databases return an
            explicit error rather than current data. A <code className={inlineCode}>.fsqlite-history</code>{" "}
            sidecar for file-backed history is designed but not built.
          </p>
        </div>

        <VersionChainExplorer />
      </Topic>

      <Topic id="write-path" title="The Commit Path" status={STATUS.writeCoordinator}>
        <Prose>
          The design calls for a dedicated{" "}
          <FrankenJargon term="write-coordinator">write coordinator</FrankenJargon>: connections
          submit validated commits over a channel, and one task batches them into the WAL with a
          two-fsync sequence. That is not how the live engine works yet. Today each connection runs
          its own commit inside the registry guard described above, and the coordinator service
          only exists as lifecycle scaffolding.
        </Prose>
        <Prose last>
          The visualization below shows the planned pipeline. Press <strong>Run Pipeline</strong>{" "}
          to watch workers hand off page diffs to the coordinator&apos;s validate, append and flush
          stages.
        </Prose>
        <WriteCoordinator />
      </Topic>

      <Topic id="wal-index" title="The WAL Index" status={STATUS.walIndex}>
        <Prose>
          With a write-ahead log, the newest copy of a page might be in the WAL rather than the main
          file. SQLite keeps a hash table in the <code>-shm</code> shared-memory file that maps page
          numbers to WAL frames, so a reader can find the right frame without scanning the log.
        </Prose>
        <Prose last>
          FrankenSQLite reads and writes that structure in SQLite&apos;s own format and honors its
          reader marks and checkpoint rules. Even so, don&apos;t point FrankenSQLite and stock
          SQLite at the same file at the same time; hand a database from one to the other after a
          checkpoint. Type a page number below to watch the lookup probe the table.
        </Prose>
        <WalIndexShm />
      </Topic>

      <Topic id="page-cache" title="The Page Cache" status={STATUS.pageCache}>
        <Prose>
          A plain LRU cache does badly on databases: one big table scan pushes out the pages
          everything else keeps using. FrankenSQLite&apos;s pager uses S3-FIFO by default, which
          admits new pages to a small probationary queue so one-off scan pages leave quickly.
        </Prose>
        <Prose last>
          An <FrankenJargon term="arc-cache">ARC</FrankenJargon> policy is also implemented and can
          be selected through the pager&apos;s API (there is no PRAGMA for it). ARC balances a recency list against a frequency list and keeps
          &ldquo;ghost&rdquo; entries for recently evicted pages to learn which side deserves more
          room. The demo below shows ARC&apos;s four lists at work.
        </Prose>
        <ArcEviction />
      </Topic>

      <Topic id="varint" title="Byte-for-Byte File Format" status={STATUS.varint}>
        <Prose>
          Compatibility comes down to details like this one. SQLite stores rowids, record header
          sizes and serial types as variable-length integers: one byte for small values, up to nine
          for the largest. FrankenSQLite encodes and decodes them exactly the same way, along with
          the rest of the record and B-tree page format, so files move between it and stock{" "}
          <code>sqlite3</code> without conversion.
        </Prose>
        <Prose last>
          Drag the slider below to see how integers of different sizes map to byte widths.
        </Prose>
        <VarintEncoding />
      </Topic>

      {/* ================================================================
          ON THE BENCH
          ================================================================ */}
      <GroupDivider eyebrow="On the bench" title="Built, Partial, or Designed">
        These are the ideas the project is known for. Some have working code that isn&apos;t
        connected to the default runtime yet; some are partly wired; some are designs with pieces
        landing. Each section says which.
      </GroupDivider>

      <Topic id="merge-ladder" title="The Safe Merge Ladder" status={STATUS.mergeLadder}>
        <Prose>
          Page-level MVCC has one built-in weakness. Two transactions that insert different rows
          into the same leaf page conflict, even though their changes don&apos;t overlap in any
          meaningful way. Today the second committer simply retries. The merge ladder is the
          planned way to let both commit when that is provably safe.
        </Prose>
        <Prose last>
          The code is in <code>fsqlite-mvcc</code> and tested, but the live commit path doesn&apos;t
          call it and the intent log isn&apos;t recorded during writes yet. Tracked as bd-3d5y3 and
          bd-p4dcv.
        </Prose>

        <div className="grid gap-4 sm:grid-cols-3 mb-12">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-400 text-sm font-black">
                1
              </span>
              <h3 className="text-sm font-black text-white">Rebase the intent</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each writer logs what it meant to do at the B-tree level (&ldquo;insert rowid
              42&rdquo;). On conflict, <FrankenJargon term="deterministic-rebase">replay</FrankenJargon>{" "}
              that log against the winner&apos;s page. If the B-tree invariants and constraints
              still hold, commit.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 text-sm font-black">
                2
              </span>
              <h3 className="text-sm font-black text-white">Structured patch</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              If the two transactions touched different cells (compared by cell key, not by byte
              range), merge the cell changes, serialize any page-header changes, and re-check the
              page.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 text-sm font-black">
                3
              </span>
              <h3 className="text-sm font-black text-white">Abort and retry</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              A real conflict. The loser gets <code className={inlineCode}>SQLITE_BUSY_SNAPSHOT</code>
              . This is the only rung the live engine uses today.
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed max-w-3xl mb-8">
          What&apos;s deliberately missing: merging raw byte ranges. Two writes can touch disjoint
          bytes and still collide, for example when one transaction moves a cell and the other
          edits the cell&apos;s old location. A byte-level merge would silently drop the second
          update, so the design forbids it for B-tree, overflow, freelist and pointer-map pages.
        </p>
        <ConflictLadder />
      </Topic>

      <Topic id="raptorq" title="RaptorQ Repair Symbols" status={STATUS.raptorq}>
        <Prose>
          <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> (RFC 6330) is a fountain code. It
          splits data into K source symbols and can generate as many{" "}
          <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> as you like; almost any
          K symbols, plus a small margin, are enough to rebuild the original. The math happens in{" "}
          <FrankenJargon term="gf256">GF(256)</FrankenJargon>: a fast peeling decoder handles most
          symbols and{" "}
          <FrankenJargon term="inactivation-decoding">Gaussian elimination</FrankenJargon> finishes
          the rest.
        </Prose>
        <Prose last>
          In the engine today, file-backed connections encode durable WAL ranges into a{" "}
          <code>-wal-fec</code> sidecar in the background after each WAL sync (
          <code>PRAGMA raptorq_repair_symbols</code>, default 2, sets the budget). On Unix, an
          explicit <code>repair_and_open</code> call can rebuild damaged frames from it and write a
          verified backup. Ordinary opens don&apos;t do that yet, so default recovery still behaves
          like SQLite&apos;s. Click pages in the demo to corrupt them and see how
          many losses a given amount of repair data can absorb.
        </Prose>
        <RaptorQHealing />
      </Topic>

      <Topic id="ecs" title="Erasure-Coded Streams" status={STATUS.ecs}>
        <Prose>
          Native mode replaces the mutable database file with an append-only stream of commit
          capsules. Each capsule holds a commit&apos;s page changes and the evidence its validation
          used, and is stored as RaptorQ symbols. A commit counts once its marker, which points to
          the previous marker, is durable. A standard <code>.db</code> can still be exported for
          compatibility.
        </Prose>
        <Prose last>
          Because the code is <FrankenJargon term="systematic-layout">systematic</FrankenJargon>,
          the original bytes are stored unchanged and ordinary reads don&apos;t decode anything.
          This is design plus partial implementation: native WAL publication, recovery and page
          groups are landing on <code>main</code>, but there is no stable switch for it yet. Step
          through below to see a page split into symbols, encoded, and recovered.
        </Prose>
        <EcsFormat />
      </Topic>

      <Topic id="storage-modes" title="Two Storage Modes" status={STATUS.storageModes}>
        <Prose last>
          Compatibility mode, on standard SQLite files, is what runs today and what everything else
          on this site assumes. Native mode is where the project is heading. The comparison below
          follows one write through each to show where they diverge.
        </Prose>
        <StorageModes />
      </Topic>

      <Topic id="xor-delta" title="Compact Version Storage" status={STATUS.xorDelta}>
        <Prose last>
          Storing a full page copy for every version gets expensive when most writes change a few
          bytes. Storing the XOR of two consecutive versions keeps only what changed, and a full
          snapshot can reset the chain when a page changes a lot. Note that this is about storing
          versions compactly, which is safe; it is not the same thing as merging two
          writers&apos; changes byte by byte, which the design forbids.
        </Prose>
        <XorDeltaChain />
      </Topic>

      {/* ================================================================
          RESEARCH CODE
          ================================================================ */}
      <GroupDivider eyebrow="Research" title="Ideas in the Tree">
        Techniques from the database research literature that have implementations in the
        workspace but don&apos;t sit on the query or cache path of the default runtime.
      </GroupDivider>

      <Topic id="learned-index" title="Learned Indexes" status={STATUS.learnedIndex}>
        <Prose last>
          A B-tree finds a key by walking from the root to a leaf, three or four page hops for a
          typical table. A learned index fits a small piecewise-linear model to the sorted keys and
          predicts where a key should be, then searches a bounded window around the guess. It works
          best on large, read-mostly data with a smooth key distribution.
        </Prose>
        <LearnedIndex />
      </Topic>

      <Topic id="database-cracking" title="Database Cracking" status={STATUS.cracking}>
        <Prose last>
          Cracking builds an index as a side effect of queries. Each range query partitions the
          column around its bounds, so the data gradually sorts itself along the ranges people
          actually ask for. Run the three queries below and watch the array reorganize.
        </Prose>
        <DatabaseCracking />
      </Topic>

      <Topic id="cooling-protocol" title="The Cooling Protocol" status={STATUS.cooling}>
        <Prose last>
          An idea borrowed from LeanStore: instead of evicting the least recently used page
          directly, pages pass through a &ldquo;cooling&rdquo; stage first, and a page that gets
          touched again while cooling goes back to hot. Click pages below to re-heat them, then run
          a background scan to watch the cycle.
        </Prose>
        <CoolingProtocol />
      </Topic>

      <Topic id="bocpd" title="Detecting Workload Shifts" status={STATUS.bocpd}>
        <Prose last>
          <FrankenJargon term="bocpd">Bayesian online change-point detection</FrankenJargon> keeps a
          running estimate of how long the current workload &ldquo;regime&rdquo; has lasted and
          notices when the throughput pattern changes, for example from steady OLTP to a bulk load.
          In FrankenSQLite it is an advisory component used by the harness; it doesn&apos;t tune
          the engine or gate correctness. Start the
          telemetry below and switch regimes to watch the detector respond.
        </Prose>
        <BocpdRegime />
      </Topic>

      {/* ================================================================
          VERIFICATION
          ================================================================ */}
      <GroupDivider eyebrow="Verification" title="How It Gets Checked">
        Most of the project&apos;s effort goes into proving the engine behaves like SQLite and that
        concurrency doesn&apos;t corrupt anything. These techniques live in the test harness, not in
        the database you link against.
      </GroupDivider>

      <Topic id="dpor" title="Exploring Thread Schedules" status={STATUS.dpor}>
        <Prose last>
          Random stress tests only sample the possible orderings of concurrent operations.{" "}
          <FrankenJargon term="mazurkiewicz-trace">Mazurkiewicz traces</FrankenJargon> group
          orderings that differ only in the order of independent operations, and{" "}
          <FrankenJargon term="dpor">dynamic partial-order reduction</FrankenJargon> runs one
          representative from each group. Within a bounded test, that covers every distinct
          outcome without running every interleaving. Step through below to see three orderings
          collapse into two classes.
        </Prose>
        <MazurkiewiczTraces />
      </Topic>

      <Topic id="eprocess" title="Anytime-Valid Monitoring" status={STATUS.eprocess}>
        <Prose last>
          If you check an invariant after every operation with an ordinary statistical test, you
          will eventually get a false alarm just by checking so often.{" "}
          <FrankenJargon term="e-process">E-processes</FrankenJargon> are built to be checked
          continuously while keeping the false-alarm rate under a fixed bound, which makes them a
          good fit for long concurrency soak tests. The harness uses them to watch the MVCC
          invariants. The engine also has a research-grade, opt-in mode (
          <code>PRAGMA fsqlite.write_merge = LAB_UNSAFE</code>) that lets an e-process gate skip
          some SSI checks; the default never does. Run the monitor below, then inject a violation.
        </Prose>
        <EprocessMonitor />
      </Topic>

      <Topic id="sheaf" title="Gluing Local Views" status={STATUS.sheaf}>
        <Prose last>
          Some concurrency bugs only show up globally: every pair of transactions looks consistent,
          but there&apos;s no single database state all of them could have seen. A{" "}
          <FrankenJargon term="sheaf-theoretic">sheaf-style check</FrankenJargon> treats each
          transaction&apos;s view as a local section and asks whether they glue into one global
          state. Step through three views below.
        </Prose>
        <SheafConsistency />
      </Topic>

      <Topic id="conformal" title="Distribution-Free Bounds" status={STATUS.conformal}>
        <Prose last>
          Latencies are skewed and multi-modal, so mean plus or minus a standard deviation
          misleads. <FrankenJargon term="conformal-prediction">Conformal prediction</FrankenJargon>{" "}
          produces intervals that hold without assuming a distribution. The engine uses it in one
          place today, and only if you ask: <code>PRAGMA fsqlite.retry_slo_ms</code> caps how long
          busy retries may take, calibrated from recent retry latencies. Using it as a
          performance release gate is still a design target.
        </Prose>
        <ConformalCalibration />
      </Topic>

      {/* FULL CRATE LIST */}
      <section className="py-16 pb-32">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-12">
            All {crates.length} Crates
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
