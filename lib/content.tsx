import React, { type ReactNode } from "react";
import type { BuildStatus } from "@/components/franken-elements";
import { FrankenJargon } from "@/components/franken-jargon";
import { engineSnapshot } from "@/lib/site-config";

export { engineSnapshot, navItems, siteConfig } from "@/lib/site-config";

// ---------------------------------------------------------------------------
// FrankenSQLite — Master content data
//
// Every claim in this file should match the engine repository
// (github.com/Dicklesworthstone/frankensqlite) as of the release named in
// `engineSnapshot`. When the engine moves, update the snapshot and the
// `status` fields together.
// ---------------------------------------------------------------------------

// ---- Types ----------------------------------------------------------------

export type Stat = { label: string; value: string; helper?: string };
export type Feature = {
  title: string;
  description: ReactNode;
  icon: string;
  status: BuildStatus;
};
export type Screenshot = { src: string; alt: string; title: string };
export type ChangelogEntry = { period: string; title: string; items: ReactNode[] };

// ---- 2. Hero stats --------------------------------------------------------

export const heroStats: Stat[] = [
  {
    label: "Workspace Crates",
    value: "28",
    helper: "26 of them published on crates.io",
  },
  {
    label: "Crates Allowed Unsafe",
    value: "2",
    helper: "The VFS (mmap, shared memory) and the optional C ABI shim",
  },
  {
    label: "Lines of Rust",
    value: "1.8M+",
    helper: "Under crates/, tests included",
  },
  {
    label: "Passing Test Results",
    value: "25K+",
    helper: "v0.4.9 release gate; the 68 failures are listed in the changelog",
  },
];

// ---- 3. Features ----------------------------------------------------------

export const features: Feature[] = [
  {
    title: "Concurrent Writers",
    status: "live",
    description: (
      <>
        Several connections in one process can write at once. <FrankenJargon term="mvcc" /> tracks
        versions per page, so writers that touch different pages don&apos;t queue behind a single
        lock. Plain <code className="text-teal-300 text-xs">BEGIN</code> is promoted to{" "}
        <code className="text-teal-300 text-xs">BEGIN CONCURRENT</code> by default.
      </>
    ),
    icon: "cpu",
  },
  {
    title: "Serializable by Default",
    status: "live",
    description: (
      <>
        Concurrent transactions run under <FrankenJargon term="ssi">SSI</FrankenJargon> using the{" "}
        <FrankenJargon term="cahill-fekete">Cahill/Fekete rule</FrankenJargon> at page granularity.
        Write skew gets caught at commit instead of quietly corrupting an invariant.
      </>
    ),
    icon: "shield",
  },
  {
    title: "Your Existing SQLite Files",
    status: "live",
    description: (
      <>
        Opens standard <code className="text-teal-300 text-xs">.db</code> files with rollback
        journal or <FrankenJargon term="wal">WAL</FrankenJargon>, in UTF-8 or UTF-16. Files it
        writes stay readable by stock <code className="text-teal-300 text-xs">sqlite3</code>.
      </>
    ),
    icon: "blocks",
  },
  {
    title: "Safe Rust Core",
    status: "live",
    description: (
      <>
        The workspace forbids <code className="text-teal-300 text-xs">unsafe</code> by default.
        Two crates opt out: the VFS, which needs raw pointers for mmap and shared memory, and the
        optional C ABI shim. The parser, planner, VDBE, B-tree, pager and MVCC code are all safe
        Rust.
      </>
    ),
    icon: "lock",
  },
  {
    title: "SQLite's SQL, Checked Against SQLite",
    status: "partial",
    description: (
      <>
        Joins, CTEs, window functions, triggers, views, UPSERT and RETURNING, compared row by row
        against C SQLite {"3.52"}. A few query shapes still run through a compatibility executor
        instead of compiled <FrankenJargon term="vdbe" /> bytecode.
      </>
    ),
    icon: "terminal",
  },
  {
    title: "Built-in Extensions",
    status: "live",
    description: (
      <>
        FTS5 with BM25 ranking, JSON1, R-tree and geopoly, ICU collation and{" "}
        <code className="text-teal-300 text-xs">generate_series</code> are registered out of the
        box. FTS3/FTS4 virtual tables, <code className="text-teal-300 text-xs">dbstat</code> and{" "}
        <code className="text-teal-300 text-xs">carray</code> are not there yet.
      </>
    ),
    icon: "sparkles",
  },
  {
    title: "Transaction Telemetry",
    status: "live",
    description: (
      <>
        PRAGMAs report live transaction stats, per-transaction activity, an advisor that flags long
        transactions and rollback pressure, and a{" "}
        <FrankenJargon term="timeline-profiling">JSON timeline</FrankenJargon> you can feed to a
        visualizer.
      </>
    ),
    icon: "barChart",
  },
  {
    title: "Async, With Real Cancellation",
    status: "live",
    description: (
      <>
        Every connection call is a future. The engine runs on{" "}
        <FrankenJargon term="structured-concurrency">asupersync</FrankenJargon>, whose capability
        context carries cancellation through the parser, planner and VDBE. Bring your own executor
        thread; connections stay on it.
      </>
    ),
    icon: "workflow",
  },
  {
    title: "Time-Travel Queries",
    status: "partial",
    description: (
      <>
        <code className="text-teal-300 text-xs">SELECT ... FOR SYSTEM_TIME AS OF COMMITSEQ 42</code>{" "}
        reads the table as it was after commit 42. Today this works on{" "}
        <code className="text-teal-300 text-xs">:memory:</code> databases only; file-backed history
        is designed but not built.
      </>
    ),
    icon: "activity",
  },
  {
    title: "RaptorQ WAL Repair",
    status: "partial",
    description: (
      <>
        File-backed connections generate <FrankenJargon term="raptorq" />{" "}
        <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> for the WAL in the
        background, into a <code className="text-teal-300 text-xs">-wal-fec</code> sidecar. Opening
        a damaged database doesn&apos;t use them automatically yet; there is an explicit repair API
        on Unix.
      </>
    ),
    icon: "layers",
  },
  {
    title: "Same-Page Merging",
    status: "dormant",
    description: (
      <>
        The <FrankenJargon term="safe-merge-ladder" /> (intent replay plus structured page patches)
        is written and tested, but the live commit path doesn&apos;t use it. Today a same-page
        conflict means one writer gets <code className="text-teal-300 text-xs">SQLITE_BUSY_SNAPSHOT</code>{" "}
        and retries.
      </>
    ),
    icon: "globe",
  },
  {
    title: "Page-Level Encryption",
    status: "dormant",
    description: (
      <>
        <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> with an{" "}
        <FrankenJargon term="dek-kek">Argon2id DEK/KEK envelope</FrankenJargon> exists in the pager,
        but nothing calls it. <code className="text-teal-300 text-xs">PRAGMA key</code> is silently
        ignored and your data is written unencrypted.
      </>
    ),
    icon: "keyRound",
  },
];

// ---- 4. Status board ------------------------------------------------------

export type StatusGroup = {
  status: BuildStatus;
  heading: string;
  blurb: string;
  items: { name: string; detail: ReactNode }[];
};

export const statusBoard: StatusGroup[] = [
  {
    status: "live",
    heading: "Works today",
    blurb: "On by default in the current compatibility runtime.",
    items: [
      {
        name: "Multiple writers in one process",
        detail:
          "One Connection per thread against the same file. Writers on different pages overlap; same-page conflicts retry with SQLITE_BUSY_SNAPSHOT.",
      },
      {
        name: "Serializable isolation",
        detail:
          "Page-level SSI is on by default. PRAGMA fsqlite.serializable = OFF drops to snapshot isolation.",
      },
      {
        name: "Standard SQLite files",
        detail:
          "Rollback journal and WAL, UTF-8 and UTF-16. Stock sqlite3 can read what FrankenSQLite writes.",
      },
      {
        name: "Extensions",
        detail: "FTS5, JSON1 (json_each, json_tree), R-tree and geopoly, ICU, generate_series.",
      },
      {
        name: "Observability PRAGMAs",
        detail: "fsqlite_txn_stats, fsqlite_transactions, fsqlite_txn_advisor, fsqlite_txn_timeline_json.",
      },
      {
        name: "CLI and packages",
        detail:
          "Signed prebuilt binaries for Linux (x86-64, ARM64), macOS and Windows, plus the fsqlite crates on crates.io.",
      },
    ],
  },
  {
    status: "partial",
    heading: "Partly there",
    blurb: "Opt-in, or usable in some configurations with known edges.",
    items: [
      {
        name: "Multi-process writers",
        detail:
          "Shared-memory coordination exists, but MVCC authority is still process-local. Proven only up to the scale the swarm harness has run.",
      },
      {
        name: "Interop with stock SQLite",
        detail:
          "Either engine can open the other's files. Running both on the same file at the same time is not supported.",
      },
      {
        name: "Time travel",
        detail: "FOR SYSTEM_TIME AS OF works on :memory: databases. File-backed history is design work.",
      },
      {
        name: "WAL repair symbols",
        detail:
          "Generated in the background into a -wal-fec sidecar (PRAGMA raptorq_repair_symbols sets how many). Normal recovery doesn't use them; an explicit repair_and_open API exists on Unix.",
      },
      {
        name: "Compiled execution",
        detail:
          "Most table work compiles to VDBE bytecode. Some CTE, view, join and window shapes still use a compatibility executor.",
      },
      {
        name: "VDBE JIT",
        detail: "Functional but off by default. PRAGMA fsqlite.jit_enable = 1 opts in.",
      },
      {
        name: "Browser build",
        detail:
          "A WASM build with a TypeScript SDK and worker. In-memory, with explicit IndexedDB snapshots; the packages aren't on npm yet.",
      },
    ],
  },
  {
    status: "dormant",
    heading: "Built, not wired",
    blurb: "Code and tests exist; the default runtime doesn't call them.",
    items: [
      {
        name: "Safe write-merge ladder",
        detail: "Intent replay and structured page patches. Tracked as bd-3d5y3 / bd-p4dcv.",
      },
      {
        name: "Page encryption",
        detail:
          "XChaCha20-Poly1305 with Argon2id key wrapping lives in fsqlite-pager. No PRAGMA key/rekey dispatch yet.",
      },
      {
        name: "Research code",
        detail:
          "Learned indexes, database cracking, a cooling-stage cache protocol and pointer swizzling in fsqlite-btree, plus an ARC cache policy and BOCPD workload detection. Implemented and tested; the runtime doesn't call them.",
      },
      {
        name: "Vectorized operators",
        detail:
          "Batch hash join, sort and aggregation kernels are benchmarked but have no live call sites. Only the vectorized MakeRecord encoder is on.",
      },
    ],
  },
  {
    status: "design",
    heading: "On the drawing board",
    blurb: "Specified in detail, implemented in pieces.",
    items: [
      {
        name: "Native mode (ECS)",
        detail:
          "An append-only, RaptorQ-encoded commit stream as the source of truth. The WAL pieces are landing on main now.",
      },
      {
        name: "File-backed time travel",
        detail: "A .fsqlite-history sidecar is the chosen design; not implemented.",
      },
      {
        name: "Cross-process MVCC",
        detail: "Mapped page-lock tables and MVCC shared memory exist as infrastructure only.",
      },
    ],
  },
];

// ---- 5. Crate workspace ---------------------------------------------------

export const crates: { name: string; description: ReactNode }[] = [
  { name: "fsqlite", description: "Public API: Connection::open, execute, query, prepare" },
  {
    name: "fsqlite-core",
    description: "Connection hub: statement dispatch, transactions, schema, VDBE bridge",
  },
  {
    name: "fsqlite-types",
    description: "PageNumber, PageSize, TxnId, SqliteValue, opcodes, serial types",
  },
  {
    name: "fsqlite-error",
    description: "Error variants, SQLite error-code mapping, transient-error detection",
  },
  { name: "fsqlite-vfs", description: "OS abstraction: files, locks, mmap and shared memory" },
  {
    name: "fsqlite-pager",
    description: "Page cache (S3-FIFO eviction), rollback journal, write-back",
  },
  {
    name: "fsqlite-wal",
    description: (
      <>
        <FrankenJargon term="wal" /> frames, checkpoints, WAL index, crash recovery
      </>
    ),
  },
  {
    name: "fsqlite-mvcc",
    description: (
      <>
        Page-level <FrankenJargon term="mvcc" />, snapshots, SSI validation, version GC
      </>
    ),
  },
  {
    name: "fsqlite-btree",
    description: "B-tree cells, page splits, overflow chains, cursors",
  },
  { name: "fsqlite-ast", description: "Typed AST for statements and expressions" },
  { name: "fsqlite-parser", description: "Hand-written lexer and parser, Pratt expressions" },
  {
    name: "fsqlite-planner",
    description: "Name resolution, WHERE analysis, join ordering, index choice",
  },
  {
    name: "fsqlite-vdbe",
    description: (
      <>
        <FrankenJargon term="vdbe" /> bytecode VM with 190+ opcodes and code generation
      </>
    ),
  },
  { name: "fsqlite-func", description: "Scalar, aggregate, window, date/time and math functions" },
  { name: "fsqlite-ext-fts5", description: "FTS5 full-text search with BM25 ranking" },
  {
    name: "fsqlite-ext-fts3",
    description: "FTS3/FTS4 query helpers (no virtual-table module yet)",
  },
  { name: "fsqlite-ext-json", description: "JSON1 functions plus json_each and json_tree" },
  { name: "fsqlite-ext-rtree", description: "R-tree spatial indexes and geopoly functions" },
  { name: "fsqlite-ext-session", description: "Changesets and patchsets (manual library API)" },
  { name: "fsqlite-ext-icu", description: "ICU collation and Unicode case folding" },
  {
    name: "fsqlite-ext-misc",
    description: "generate_series plus uuid and decimal helpers",
  },
  {
    name: "fsqlite-observability",
    description: "Metrics, tracing, latency and conflict telemetry",
  },
  { name: "fsqlite-cli", description: "The fsqlite shell: REPL, -c, .read, .dump, output modes" },
  { name: "fsqlite-c-api", description: "Optional SQLite-style C ABI shim" },
  { name: "fsqlite-wasm", description: "Experimental WebAssembly build behind the TypeScript SDK" },
  {
    name: "fsqlite-harness",
    description: "Conformance and differential testing against C SQLite",
  },
  { name: "fsqlite-e2e", description: "Workload replay, swarm tests and the benchmark matrix" },
  { name: "beads-doctor", description: "Health checks for Beads issue databases" },
];

// ---- 6. Comparison table --------------------------------------------------

export const comparisonEngines = [
  { key: "frankensqlite", label: "FrankenSQLite" },
  { key: "csqlite", label: "C SQLite" },
  { key: "turso", label: "Turso" },
  { key: "libsql", label: "libSQL" },
  { key: "duckdb", label: "DuckDB" },
] as const;

export type ComparisonEngineKey = (typeof comparisonEngines)[number]["key"];
export type ComparisonCell = { text: string; tone: "yes" | "partial" | "no" | "na" };
export type ComparisonRow = {
  feature: string;
  note?: string;
  cells: Record<ComparisonEngineKey, ComparisonCell>;
};

const yes = (text: string): ComparisonCell => ({ text, tone: "yes" });
const partial = (text: string): ComparisonCell => ({ text, tone: "partial" });
const no = (text: string): ComparisonCell => ({ text, tone: "no" });
const na = (text: string): ComparisonCell => ({ text, tone: "na" });

export const comparisonData: ComparisonRow[] = [
  {
    feature: "Implementation language",
    cells: {
      frankensqlite: yes("Rust"),
      csqlite: na("C"),
      turso: yes("Rust"),
      libsql: na("C (SQLite fork)"),
      duckdb: na("C++"),
    },
  },
  {
    feature: "Concurrent writers",
    cells: {
      frankensqlite: yes("Default (plain BEGIN)"),
      csqlite: no("One at a time"),
      turso: partial("BEGIN CONCURRENT in MVCC mode"),
      libsql: no("One at a time"),
      duckdb: yes("Yes"),
    },
  },
  {
    feature: "Version granularity",
    cells: {
      frankensqlite: yes("Page"),
      csqlite: na("None (one writer)"),
      turso: yes("Row"),
      libsql: na("None (one writer)"),
      duckdb: yes("Row"),
    },
  },
  {
    feature: "Isolation with concurrent writers",
    note: "Snapshot isolation allows write skew; serializable does not.",
    cells: {
      frankensqlite: yes("Serializable (page SSI)"),
      csqlite: yes("Serializable by serializing"),
      turso: partial("Snapshot isolation"),
      libsql: yes("Serializable by serializing"),
      duckdb: partial("Snapshot isolation"),
    },
  },
  {
    feature: "Opens existing SQLite files",
    cells: {
      frankensqlite: yes("Yes"),
      csqlite: yes("Yes"),
      turso: partial("Yes; MVCC mode adds its own log"),
      libsql: yes("Yes"),
      duckdb: partial("Via extension"),
    },
  },
  {
    feature: "Memory safety",
    cells: {
      frankensqlite: yes("Safe Rust; unsafe in 2 crates"),
      csqlite: no("Manual"),
      turso: partial("Rust with unsafe in core"),
      libsql: no("Manual"),
      duckdb: no("Manual"),
    },
  },
  {
    feature: "Corruption repair",
    cells: {
      frankensqlite: partial("WAL repair symbols; auto-recovery pending"),
      csqlite: no("Detect only"),
      turso: no("Detect, truncate torn tail"),
      libsql: no("Detect only"),
      duckdb: no("Detect only"),
    },
  },
  {
    feature: "Encryption at rest",
    cells: {
      frankensqlite: no("Implemented, not wired"),
      csqlite: partial("Paid SEE extension"),
      turso: partial("Experimental"),
      libsql: yes("Yes"),
      duckdb: yes("Yes"),
    },
  },
  {
    feature: "Async API",
    cells: {
      frankensqlite: yes("Yes (asupersync)"),
      csqlite: no("No"),
      turso: yes("Yes"),
      libsql: partial("Client libraries"),
      duckdb: no("No"),
    },
  },
  {
    feature: "Analytical workloads",
    cells: {
      frankensqlite: partial("Row store"),
      csqlite: partial("Row store"),
      turso: partial("Row store"),
      libsql: partial("Row store"),
      duckdb: yes("Columnar, vectorized"),
    },
  },
  {
    feature: "Track record",
    cells: {
      frankensqlite: partial("Pre-1.0, since Feb 2026"),
      csqlite: yes("25 years"),
      turso: partial("Beta"),
      libsql: yes("Production"),
      duckdb: yes("Production"),
    },
  },
];

// ---- 7. Code examples -----------------------------------------------------

export const cargoSetupExample = `# FrankenSQLite builds on a pinned nightly toolchain (edition 2024).
cargo add fsqlite
cargo add asupersync --no-default-features`;

export const codeExample = `#![recursion_limit = "512"] // the engine's futures nest deeply

use asupersync::runtime::RuntimeBuilder;
use fsqlite::{Connection, SqliteValue};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A small blocking pool for file I/O, the same setup the fsqlite CLI uses.
    let runtime = RuntimeBuilder::current_thread().blocking_threads(1, 2).build()?;
    runtime.block_on(async {
        let conn = Connection::open("app.db").await?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id    INTEGER PRIMARY KEY,
                name  TEXT NOT NULL,
                email TEXT UNIQUE
            );",
        )
        .await?;

        conn.execute_with_params(
            "INSERT INTO users (name, email) VALUES (?1, ?2);",
            &[SqliteValue::from("Alice"), SqliteValue::from("alice@example.com")],
        )
        .await?;

        // Prepared statements borrow the connection; drop them before close().
        {
            let stmt = conn.prepare("SELECT id, name FROM users WHERE name = ?1;").await?;
            for row in stmt.query_with_params(&[SqliteValue::from("Alice")]).await? {
                println!("{:?} {:?}", row.get(0), row.get(1));
            }
        }

        conn.close().await
    })?;
    Ok(())
}`;

export const concurrentWritersExample = `#![recursion_limit = "512"]

use asupersync::runtime::RuntimeBuilder;
use fsqlite::{Connection, FrankenError, SqliteValue};
use std::thread;

const DB: &str = "events.db";

fn main() -> Result<(), Box<dyn std::error::Error>> {
    RuntimeBuilder::current_thread().blocking_threads(1, 2).build()?.block_on(async {
        let conn = Connection::open(DB).await?;
        conn.execute("CREATE TABLE IF NOT EXISTS events (writer INTEGER, seq INTEGER);")
            .await?;
        conn.close().await
    })?;

    // Connection is !Send: each writer gets its own thread, runtime and connection.
    let writers: Vec<_> = (0..4_i64)
        .map(|writer| {
            thread::spawn(move || -> Result<(), FrankenError> {
                let runtime = RuntimeBuilder::current_thread()
                    .blocking_threads(1, 2)
                    .build()
                    .expect("runtime");
                runtime.block_on(async {
                    let conn = Connection::open(DB).await?;
                    for seq in 0..1_000_i64 {
                        let params = [SqliteValue::from(writer), SqliteValue::from(seq)];
                        let mut retries = 0_u8;
                        loop {
                            match conn
                                .execute_with_params(
                                    "INSERT INTO events (writer, seq) VALUES (?1, ?2);",
                                    &params,
                                )
                                .await
                            {
                                Ok(_) => break,
                                // Same-page conflicts (SQLITE_BUSY_SNAPSHOT) are transient.
                                // Retry them, with backoff in real code.
                                Err(e) if e.is_transient() && retries < 8 => retries += 1,
                                Err(e) => return Err(e),
                            }
                        }
                    }
                    conn.close().await
                })
            })
        })
        .collect();

    for writer in writers {
        writer.join().expect("writer thread panicked")?;
    }
    Ok(())
}`;

export const timeTravelExample = `-- Time travel currently works on :memory: databases only.
-- Each commit gets a sequence number. Use explicit transactions:
-- in v0.4.9, plain autocommit statements don't always get their own snapshot.
CREATE TABLE prices (item TEXT PRIMARY KEY, price REAL);           -- commit 1

BEGIN; INSERT INTO prices VALUES ('widget', 9.99); COMMIT;          -- commit 2
BEGIN; UPDATE prices SET price = 14.99 WHERE item = 'widget'; COMMIT; -- commit 3

SELECT price FROM prices;                                    -- 14.99
SELECT price FROM prices FOR SYSTEM_TIME AS OF COMMITSEQ 2;  -- 9.99

-- A commit that isn't in the snapshot ring is an error,
-- never a silent read of current data.
SELECT price FROM prices FOR SYSTEM_TIME AS OF COMMITSEQ 999;  -- error`;

export const pragmaExample = `-- What mode am I in?
PRAGMA fsqlite_concurrency;              -- e.g. begin_promotes_to | BEGIN CONCURRENT

-- Concurrency
PRAGMA fsqlite.concurrent_mode = OFF;    -- plain BEGIN goes back to one writer at a time
PRAGMA fsqlite.serializable = OFF;       -- snapshot isolation instead of SSI
PRAGMA fsqlite.retry_slo_ms = 50;        -- opt-in cap on busy-retry latency (off by default)

-- Transaction telemetry (safe to query under load)
PRAGMA fsqlite_txn_stats;                -- lifecycle counters
PRAGMA fsqlite_transactions;             -- one row per active transaction
PRAGMA fsqlite_txn_advisor;              -- long_txn, large_read_set, rollback_pressure, ...
PRAGMA fsqlite_txn_timeline_json;        -- JSON for timeline tooling
PRAGMA fsqlite.conflict_stats;           -- MVCC conflict counters

-- Advisor thresholds
PRAGMA fsqlite.txn_advisor_long_txn_ms = 5000;
PRAGMA fsqlite.txn_advisor_large_read_ops = 256;

-- WAL repair symbols per group on native file-backed connections (default 2, 0 = off)
PRAGMA raptorq_repair_symbols = 4;

-- Opt-in VDBE JIT
PRAGMA fsqlite.jit_enable = 1;
PRAGMA fsqlite_jit_stats;`;

export const cliExample = `# Linux / macOS: signed prebuilt binary, checksum-verified
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/frankensqlite/main/install.sh?$(date +%s)" | bash

# Or build it yourself
cargo +nightly install fsqlite-cli --locked

# Open a database (stock SQLite files work)
fsqlite app.db

fsqlite> CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
fsqlite> INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');
fsqlite> .mode column
fsqlite> SELECT * FROM users;
id  name
--  -----
1   Alice
2   Bob

# One-shot commands for scripts
fsqlite app.db -c "SELECT count(*) FROM users;"
fsqlite app.db -c ".schema"`;

export const windowsInstallExample = `irm "https://raw.githubusercontent.com/Dicklesworthstone/frankensqlite/main/install.ps1?$([DateTime]::UtcNow.Ticks)" | iex`;

// ---- 8. Development timeline ----------------------------------------------

export const changelog: ChangelogEntry[] = [
  {
    period: "Feb 2026",
    title: "An 18,000-line spec, then the first engine",
    items: [
      "The project starts on February 6. The design spec grows to 18,231 lines over dozens of revision passes before any serious code is written.",
      "The spec is broken into hundreds of Beads issues, and a swarm of coding agents works through them.",
      "About 2,500 commits land in the first six weeks. MCP Agent Mail's Rust rewrite starts using FrankenSQLite almost immediately.",
    ],
  },
  {
    period: "Mar–May 2026",
    title: "The performance campaign",
    items: [
      "A benchmark matrix pits FrankenSQLite against C SQLite across reads, inserts, updates and deletes, from 1,000 to 100,000 rows, on 1 to 32 threads.",
      "Every optimization that failed to move the matrix goes into a negative-results ledger, which agents read before trying the next idea. It now holds 648 entries.",
      "The May 9 run had FrankenSQLite ahead on 79 of 93 scenarios. Those numbers predate the async storage rewrite and are no longer treated as release evidence.",
    ],
  },
  {
    period: "Jun–Aug 2026",
    title: "Releases, dogfooding, and going async",
    items: [
      "Regular releases begin, with signed prebuilt binaries and checksum-verifying installers.",
      "cass, beads_rust and the Rust MCP Agent Mail build on FrankenSQLite, and their bug reports drive much of the fix list.",
      "In late July the storage stack moves to async I/O (released as v0.2.0 on August 4), and the project withdraws its performance numbers until they can be re-measured cleanly.",
    ],
  },
  {
    period: "Sep 2026",
    title: "One version for every crate",
    items: [
      "v0.4.0 aligns with asupersync 0.5. From v0.4.4 on, every crate ships at the same version.",
      "Groundwork for cross-process MVCC lands: a mapped page-lock table and MVCC shared memory, not yet in charge of the public Connection.",
      "A TypeScript SDK and WASM worker land in the repo, along with UTF-16 database support and a long list of stock-SQLite parity fixes.",
    ],
  },
  {
    period: "Oct 2026",
    title: "v0.4.9 and native storage",
    items: [
      "v0.4.9 ships on October 3. Its release gate records 25,211 passing test results and 68 failures, each one reviewed and listed in the changelog.",
      "On main, native-mode WAL work is landing: page groups published through shared durability barriers and sealed transaction handles, plus a feature-gated service that batches native commits so writers share fsyncs. None of it is switched on for ordinary connections yet.",
    ],
  },
];

// ---- 9. How it was built ----------------------------------------------------

export const buildStory: { title: string; body: ReactNode }[] = [
  {
    title: "Spec first",
    body: "Before the engine, there was the spec: 18,231 lines covering MVCC, SSI, RaptorQ, the file format and the verification gates. It went through dozens of review passes, then got cut into hundreds of dependency-tracked Beads issues.",
  },
  {
    title: "Measure the whole workload",
    body: "Agents left alone will happily shave microseconds off code that doesn't matter. The fix was an end-to-end matrix: reads, inserts, updates and deletes, small and large row counts, 1 to 32 threads, always run against C SQLite on the same machine.",
  },
  {
    title: "Write down what didn't work",
    body: (
      <>
        Every optimization that was tried, measured and reverted goes into a{" "}
        <a
          href={engineSnapshot.negativeLedgerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
        >
          negative-results ledger
        </a>
        , with the workload, the evidence and when it might be worth retrying. Agents read it before
        starting a new idea. It now runs to 648 entries, and it is the single thing that most
        helped the project stop going in circles.
      </>
    ),
  },
  {
    title: "Dogfood it early",
    body: "cass, MCP Agent Mail and beads_rust use FrankenSQLite for their own storage. That was painful, and it is where a large share of the real bugs came from.",
  },
];

// ---- 10. Performance note -----------------------------------------------------

export const performanceNote = {
  heading: "What about speed?",
  body: "There is no current performance number to quote. The May 2026 benchmark matrix looked very good: FrankenSQLite was ahead of C SQLite on 79 of 93 scenarios, with the biggest wins on multi-writer workloads, and behind on small single-threaded write loops, where every row paid MVCC bookkeeping that C SQLite skips. In July the project declared those results non-citable. The storage stack had moved to async I/O, and some of the older runs lacked provenance or compared asymmetric settings. Until a clean, reproducible matrix exists for the current code, the README makes no numeric claims, and neither does this site.",
}

// ---- 11. Screenshots / showcase gallery ------------------------------------

export const screenshots: Screenshot[] = [
  {
    src: "/images/frankensqlite_diagram.webp",
    alt: "FrankenSQLite layered crate architecture diagram",
    title: "Architecture Diagram",
  },
  {
    src: "/images/frankensqlite_illustration.webp",
    alt: "FrankenSQLite monster illustration",
    title: "FrankenSQLite Illustration",
  },
];

// ---- 12. Architecture layers (shared between home + architecture page) -----

export type ArchitectureLayer = {
  name: string;
  iconName: string;
  color: string;
  crates: string[];
  description: ReactNode;
};

export const architectureLayers: ArchitectureLayer[] = [
  {
    name: "Foundation",
    iconName: "layers",
    color: "text-teal-400",
    crates: ["fsqlite-types", "fsqlite-error"],
    description: (
      <>
        Shared types and errors. Page numbers, transaction IDs and page sizes are distinct{" "}
        <FrankenJargon term="newtype-pattern">newtypes</FrankenJargon>, so the compiler refuses to
        mix them up. Errors map onto SQLite&apos;s result codes and know whether they are worth
        retrying.
      </>
    ),
  },
  {
    name: "Storage",
    iconName: "hardDrive",
    color: "text-blue-400",
    crates: ["fsqlite-vfs", "fsqlite-pager", "fsqlite-wal", "fsqlite-mvcc", "fsqlite-btree"],
    description: (
      <>
        The VFS talks to the OS. The pager caches pages with S3-FIFO eviction (an{" "}
        <FrankenJargon term="arc-cache">ARC</FrankenJargon> policy is implemented but not exposed)
        and manages the rollback journal. The <FrankenJargon term="wal" /> crate handles frames, checkpoints and the shared
        WAL index. <FrankenJargon term="mvcc" /> keeps per-page versions and runs SSI validation.
        The B-tree crate lays out cells, splits pages and walks cursors.
      </>
    ),
  },
  {
    name: "SQL",
    iconName: "database",
    color: "text-purple-400",
    crates: ["fsqlite-ast", "fsqlite-parser", "fsqlite-planner", "fsqlite-vdbe", "fsqlite-func"],
    description: (
      <>
        A hand-written parser produces a typed AST. Code generation turns it into{" "}
        <FrankenJargon term="vdbe" /> bytecode for a register-based VM with 190+ opcodes. The
        separate planner crate (join ordering, index selection) is substantial but not yet on the
        hot path for every query.
      </>
    ),
  },
  {
    name: "Extensions",
    iconName: "zap",
    color: "text-rose-400",
    crates: [
      "fsqlite-ext-fts5",
      "fsqlite-ext-fts3",
      "fsqlite-ext-json",
      "fsqlite-ext-rtree",
      "fsqlite-ext-session",
      "fsqlite-ext-icu",
      "fsqlite-ext-misc",
    ],
    description:
      "FTS5, JSON1, R-tree/geopoly, ICU and generate_series register in the live engine. FTS3/FTS4 are helper code without a virtual-table module, and the session crate is a manual library API.",
  },
  {
    name: "Integration",
    iconName: "cpu",
    color: "text-teal-300",
    crates: [
      "fsqlite-core",
      "fsqlite",
      "fsqlite-cli",
      "fsqlite-observability",
      "fsqlite-c-api",
      "fsqlite-wasm",
    ],
    description: (
      <>
        <code className="text-teal-300 text-xs">fsqlite-core</code> ties everything into a{" "}
        <code className="text-teal-300 text-xs">Connection</code>, and{" "}
        <code className="text-teal-300 text-xs">fsqlite</code> is the crate you depend on. Around
        them: the <code className="text-teal-300 text-xs">fsqlite</code> shell, metrics and
        tracing, an optional C ABI shim, and an experimental WebAssembly build.
      </>
    ),
  },
  {
    name: "Verification",
    iconName: "shield",
    color: "text-amber-400",
    crates: ["fsqlite-harness", "fsqlite-e2e", "beads-doctor"],
    description:
      "Most of the testing muscle lives here: differential runs against C SQLite, SQL logic tests, crash and fault injection, multi-process swarm tests, and the benchmark matrix.",
  },
];

// ---- 13. FAQ --------------------------------------------------------------

export const faq: { question: string; answer: ReactNode }[] = [
  {
    question: "What is FrankenSQLite?",
    answer: (
      <>
        A from-scratch Rust implementation of SQLite. It reads and writes the same file format,
        speaks the same SQL, and differs mainly in one way: more than one connection can write at
        the same time, using page-level <FrankenJargon term="mvcc" /> with serializable isolation.
        It was not translated from the C source; the C code was used as a behavioral reference.
      </>
    ),
  },
  {
    question: "Can I swap it in for SQLite today?",
    answer: (
      <>
        For a Rust program, possibly, but test it first. It opens existing databases and stock{" "}
        <code className="text-teal-300 text-xs">sqlite3</code> can read what it writes. The Rust API
        is its own (async, <code className="text-teal-300 text-xs">Connection</code> is{" "}
        <code className="text-teal-300 text-xs">!Send</code>), not rusqlite&apos;s, and the optional
        C shim covers only a common subset of the <code className="text-teal-300 text-xs">sqlite3_*</code>{" "}
        API. Don&apos;t run it and stock SQLite against the same file at the same time; hand files
        over after a checkpoint. The project is pre-1.0, ships frequent fixes, and lists its known
        failures in each release.
      </>
    ),
  },
  {
    question: "How many writers can run at once?",
    answer: (
      <>
        There&apos;s no fixed cap. Inside one process, open one{" "}
        <code className="text-teal-300 text-xs">Connection</code> per thread and they can write
        concurrently. Writers on different pages overlap freely. If two touch the same page, the
        second to commit gets <code className="text-teal-300 text-xs">SQLITE_BUSY_SNAPSHOT</code>{" "}
        and should retry. Several processes writing the same file is partly supported; see the{" "}
        <a
          href={engineSnapshot.concurrencyContractUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
        >
          concurrency contract
        </a>{" "}
        for exactly what is covered.
      </>
    ),
  },
  {
    question: "Why page-level MVCC instead of row-level?",
    answer:
      "Row versions would mean changing SQLite's file format and adding a vacuum process, the way PostgreSQL does. Pages are already SQLite's unit of storage and locking, so versioning them keeps the format intact. The cost is that two writers touching different rows on the same leaf page still conflict.",
  },
  {
    question: "Does it prevent deadlocks?",
    answer:
      "Page-lock acquisition never waits: if a page is taken, the transaction fails fast with a busy error. With no waiting there is no wait-for cycle, so page locks cannot deadlock. Your retry loop needs backoff, though.",
  },
  {
    question: "Is there any unsafe Rust?",
    answer: (
      <>
        Some, in two places. The workspace forbids <code className="text-teal-300 text-xs">unsafe</code>{" "}
        by default. <code className="text-teal-300 text-xs">fsqlite-vfs</code> overrides that for
        mmap and shared-memory regions, and the optional{" "}
        <code className="text-teal-300 text-xs">fsqlite-c-api</code> needs it for FFI. If you use the
        Rust crates or the CLI, the C shim isn&apos;t in your build at all.
      </>
    ),
  },
  {
    question: "Is my data encrypted if I set PRAGMA key?",
    answer: (
      <>
        No. The encryption code exists in the pager but isn&apos;t connected.{" "}
        <code className="text-teal-300 text-xs">PRAGMA key</code> is accepted and ignored, the way
        SQLite ignores unknown PRAGMAs, and the database is written in plain text. Use disk-level
        encryption until this is wired up.
      </>
    ),
  },
  {
    question: "Does RaptorQ repair my database automatically?",
    answer: (
      <>
        Not yet. File-backed connections generate{" "}
        <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> for the WAL into a{" "}
        <code className="text-teal-300 text-xs">-wal-fec</code> sidecar, and on Unix an explicit{" "}
        <code className="text-teal-300 text-xs">repair_and_open</code> call can use them to rebuild
        damaged WAL frames. Normal opens don&apos;t do that automatically. Keep your backups.
      </>
    ),
  },
  {
    question: "How does it compare to Turso?",
    answer: (
      <>
        Both are Rust reimplementations of SQLite. Turso&apos;s MVCC is opt-in (
        <code className="text-teal-300 text-xs">BEGIN CONCURRENT</code> in MVCC mode), versions
        rows, and gives snapshot isolation, so write skew is allowed. FrankenSQLite versions pages,
        is concurrent by default, and validates for serializability. Turso is further along as a
        product, with bindings, sync and a polished simulation-testing story.
      </>
    ),
  },
  {
    question: "Is it fast?",
    answer: performanceNote.body,
  },
  {
    question: "Who built it, and how?",
    answer: (
      <>
        Jeffrey Emanuel, working with a large fleet of coding agents and his own tooling: Beads for
        issue tracking, MCP Agent Mail for coordination, cass for searching past agent sessions.
        The{" "}
        <a
          href={engineSnapshot.specUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
        >
          full spec
        </a>{" "}
        and its revision history are public, and the Spec Evolution page on this site lets you step
        through how it changed.
      </>
    ),
  },
];

// ---- 13. Flywheel tools -----------------------------------------------------

export interface FlywheelTool {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  icon: string;
  color: string;
  href: string;
  features: string[];
  connectsTo: string[];
  connectionDescriptions: Record<string, string>;
  projectSlug?: string;
  demoUrl?: string;
  stars?: number;
}

export const flywheelDescription = {
  title: "The Agent Flywheel",
  subtitle: "The open-source tools used to run the agents that build FrankenSQLite.",
  description:
    "FrankenSQLite is written by fleets of coding agents. These tools keep them coordinated: tracking issues and their dependencies, passing messages, searching old sessions, and stopping destructive commands before they run.",
};

export const flywheelTools: FlywheelTool[] = [
  {
    id: "ntm",
    name: "Named Tmux Manager",
    shortName: "NTM",
    href: "https://github.com/Dicklesworthstone/ntm",
    icon: "LayoutGrid",
    color: "from-sky-500 to-blue-600",
    tagline: "Multi-agent tmux orchestration",
    connectsTo: ["slb", "mail", "cass", "bv"],
    connectionDescriptions: {
      slb: "Routes dangerous commands through safety checks",
      mail: "Human Overseer messaging and file reservations",
      cass: "Duplicate detection and session history search",
      bv: "Dashboard shows beads status; --robot-triage for dispatch",
    },
    stars: 133,
    projectSlug: "named-tmux-manager",
    features: [
      "Spawn 10+ Claude/Codex/Gemini agents in parallel",
      "Smart broadcast with type/variant/tag filtering",
      "60fps animated dashboard with health monitoring",
    ],
  },
  {
    id: "slb",
    name: "Simultaneous Launch Button",
    shortName: "SLB",
    href: "https://github.com/Dicklesworthstone/slb",
    icon: "ShieldCheck",
    color: "from-red-500 to-rose-600",
    tagline: "Peer review for dangerous commands",
    connectsTo: ["mail", "ubs"],
    connectionDescriptions: {
      mail: "Notifications sent to reviewer inboxes",
      ubs: "Pre-flight scans before execution",
    },
    stars: 56,
    projectSlug: "simultaneous-launch-button",
    features: [
      "Three-tier risk classification (CRITICAL/DANGEROUS/CAUTION)",
      "Cryptographic command binding with SHA256+HMAC",
      "Dynamic quorum based on active agents",
    ],
  },
  {
    id: "mail",
    name: "MCP Agent Mail",
    shortName: "Mail",
    href: "https://github.com/Dicklesworthstone/mcp_agent_mail",
    icon: "Mail",
    color: "from-amber-500 to-yellow-600",
    tagline: "Inter-agent messaging & coordination",
    connectsTo: ["bv", "cm", "slb"],
    connectionDescriptions: {
      bv: "Task IDs link conversations to Beads issues",
      cm: "Shared context across agent sessions",
      slb: "Approval requests delivered to inboxes",
    },
    stars: 1654,
    demoUrl: "https://dicklesworthstone.github.io/cass-memory-system-agent-mailbox-viewer/viewer/",
    projectSlug: "mcp-agent-mail",
    features: [
      "GitHub-flavored Markdown messaging between agents",
      "Advisory file reservations to prevent conflicts",
      "SQLite-backed storage for complete audit trails",
    ],
  },
  {
    id: "bv",
    name: "Beads Viewer",
    shortName: "BV",
    href: "https://github.com/Dicklesworthstone/beads_viewer",
    icon: "GitBranch",
    color: "from-violet-500 to-purple-600",
    tagline: "Graph analytics for task dependencies",
    connectsTo: ["mail", "ubs", "cass"],
    connectionDescriptions: {
      mail: "Task updates trigger mail notifications",
      ubs: "Bug scanner results create blocking issues",
      cass: "Search prior sessions for task context",
    },
    stars: 1211,
    demoUrl: "https://dicklesworthstone.github.io/beads_viewer-pages/",
    projectSlug: "beads-viewer",
    features: [
      "9 graph metrics: PageRank, Betweenness, Critical Path",
      "Robot protocol (--robot-*) for AI-ready JSON",
      "60fps TUI rendering via Bubble Tea",
    ],
  },
  {
    id: "ubs",
    name: "Ultimate Bug Scanner",
    shortName: "UBS",
    href: "https://github.com/Dicklesworthstone/ultimate_bug_scanner",
    icon: "Bug",
    color: "from-orange-500 to-amber-600",
    tagline: "Pattern-based bug detection",
    connectsTo: ["bv", "slb"],
    connectionDescriptions: {
      bv: "Creates issues for discovered bugs",
      slb: "Validates code before risky commits",
    },
    stars: 152,
    projectSlug: "ultimate-bug-scanner",
    features: [
      "1,000+ custom detection patterns across languages",
      "Consistent JSON output for all languages",
      "Perfect for pre-commit hooks and CI/CD",
    ],
  },
  {
    id: "cm",
    name: "CASS Memory System",
    shortName: "CM",
    href: "https://github.com/Dicklesworthstone/cass_memory_system",
    icon: "Brain",
    color: "from-emerald-500 to-green-600",
    tagline: "Persistent memory across sessions",
    connectsTo: ["mail", "cass", "bv"],
    connectionDescriptions: {
      mail: "Stores conversation summaries for recall",
      cass: "Semantic search over stored memories",
      bv: "Remembers task patterns and solutions",
    },
    stars: 212,
    demoUrl: "https://dicklesworthstone.github.io/cass-memory-system-agent-mailbox-viewer/viewer/",
    projectSlug: "cass-memory-system",
    features: [
      "Three-layer cognitive: episodic, working, procedural memory",
      "MCP tools for cross-session context persistence",
      "Built on top of CASS for semantic search",
    ],
  },
  {
    id: "cass",
    name: "Coding Agent Session Search",
    shortName: "CASS",
    href: "https://github.com/Dicklesworthstone/coding_agent_session_search",
    icon: "Search",
    color: "from-cyan-500 to-sky-600",
    tagline: "Unified search across 11+ agent formats",
    connectsTo: ["cm", "ntm", "bv", "mail"],
    connectionDescriptions: {
      cm: "CM integrates CASS for memory retrieval",
      ntm: "Duplicate detection before broadcasting",
      bv: "Links search results to related tasks",
      mail: "Agents query history before asking colleagues",
    },
    stars: 446,
    projectSlug: "cass",
    features: [
      "11 formats: Claude Code, Codex, Cursor, Gemini, ChatGPT, Aider, etc.",
      "Sub-5ms cached search, hybrid semantic + keyword",
      "Multi-machine sync via SSH with path mapping",
    ],
  },
  {
    id: "acfs",
    name: "Flywheel Setup",
    shortName: "ACFS",
    href: "https://github.com/Dicklesworthstone/agentic_coding_flywheel_setup",
    icon: "Cog",
    color: "from-blue-500 to-indigo-600",
    tagline: "One-command environment bootstrap",
    connectsTo: ["ntm", "mail", "dcg"],
    connectionDescriptions: {
      ntm: "Installs and configures NTM",
      mail: "Sets up Agent Mail MCP server",
      dcg: "Installs DCG safety hooks",
    },
    stars: 1006,
    projectSlug: "agentic-coding-flywheel-setup",
    features: [
      "30-minute zero-to-hero setup",
      "Installs Claude Code, Codex, Gemini CLI",
      "All flywheel tools pre-configured",
    ],
  },
  {
    id: "dcg",
    name: "Destructive Command Guard",
    shortName: "DCG",
    href: "https://github.com/Dicklesworthstone/destructive_command_guard",
    icon: "ShieldAlert",
    color: "from-red-600 to-orange-600",
    tagline: "Intercepts dangerous shell commands",
    connectsTo: ["slb", "ntm"],
    connectionDescriptions: {
      slb: "Works alongside SLB for layered command safety",
      ntm: "Guards all commands in NTM-managed sessions",
    },
    stars: 349,
    projectSlug: "destructive-command-guard",
    features: [
      "Intercepts rm -rf, git reset --hard, etc.",
      "SIMD-accelerated pattern matching",
      "Command audit logging",
    ],
  },
  {
    id: "ru",
    name: "Repo Updater",
    shortName: "RU",
    href: "https://github.com/Dicklesworthstone/repo_updater",
    icon: "RefreshCw",
    color: "from-teal-500 to-cyan-600",
    tagline: "Multi-repo sync in one command",
    connectsTo: ["ubs", "ntm"],
    connectionDescriptions: {
      ubs: "Run bug scans across all synced repos",
      ntm: "NTM integration for agent-driven sweeps",
    },
    stars: 49,
    features: [
      "One-command multi-repo sync",
      "Parallel operations with conflict detection",
      "AI code review integration",
    ],
  },
  {
    id: "giil",
    name: "Get Image from Internet Link",
    shortName: "GIIL",
    href: "https://github.com/Dicklesworthstone/giil",
    icon: "Image",
    color: "from-fuchsia-500 to-pink-600",
    tagline: "Download images from share links",
    connectsTo: ["mail", "cass"],
    connectionDescriptions: {
      mail: "Downloaded images can be referenced in Agent Mail",
      cass: "Image analysis sessions are searchable",
    },
    stars: 27,
    features: [
      "iCloud share link support",
      "CLI-based image download",
      "Works over SSH without GUI",
    ],
  },
  {
    id: "xf",
    name: "X Archive Search",
    shortName: "XF",
    href: "https://github.com/Dicklesworthstone/xf",
    icon: "Archive",
    color: "from-indigo-500 to-violet-600",
    tagline: "Ultra-fast X/Twitter archive search",
    connectsTo: ["cass", "cm"],
    connectionDescriptions: {
      cass: "Similar search architecture and patterns",
      cm: "Found tweets can become memories",
    },
    stars: 67,
    features: [
      "Sub-second search over large archives",
      "Semantic + keyword hybrid search",
      "Privacy-preserving local processing",
    ],
  },
  {
    id: "s2p",
    name: "Source to Prompt TUI",
    shortName: "s2p",
    href: "https://github.com/Dicklesworthstone/source_to_prompt_tui",
    icon: "FileCode",
    color: "from-lime-500 to-green-600",
    tagline: "Combine source files into LLM prompts",
    connectsTo: ["cass", "cm"],
    connectionDescriptions: {
      cass: "Generated prompts can be searched later",
      cm: "Effective prompts stored as memories",
    },
    stars: 13,
    features: [
      "Interactive file selection TUI",
      "Real-time token counting",
      "Gitignore-aware filtering",
    ],
  },
  {
    id: "ms",
    name: "Meta Skill",
    shortName: "MS",
    href: "https://github.com/Dicklesworthstone/meta_skill",
    icon: "Sparkles",
    color: "from-pink-500 to-rose-600",
    tagline: "Skill management with effectiveness tracking",
    connectsTo: ["cass", "cm", "bv"],
    connectionDescriptions: {
      cass: "One input source for skill extraction",
      cm: "Skills and CM memories are complementary layers",
      bv: "Graph analysis for skill dependency insights",
    },
    stars: 108,
    features: [
      "MCP server for native AI agent integration",
      "Thompson sampling optimizes suggestions",
      "Multi-layer security (ACIP, DCG, path policy)",
    ],
  },
];
