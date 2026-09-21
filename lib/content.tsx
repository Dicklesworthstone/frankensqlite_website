import React, { type ReactNode } from "react";
import { FrankenJargon } from "@/components/franken-jargon";

export { navItems, siteConfig } from "@/lib/site-config";

// ---------------------------------------------------------------------------
// FrankenSQLite — Master content data
// ---------------------------------------------------------------------------

// ---- Types ----------------------------------------------------------------

export type Stat = { label: string; value: string; helper?: string };
export type Feature = { title: string; description: ReactNode; icon: string };
export type Screenshot = { src: string; alt: string; title: string };
export type ChangelogEntry = { period: string; title: string; items: ReactNode[] };
export type ComparisonRow = {
  feature: string;
  frankensqlite: string;
  csqlite: string;
  libsql: string;
  duckdb: string;
};

// ---- 3. Hero stats --------------------------------------------------------

export const heroStats: Stat[] = [
  { label: "Workspace Crates", value: "26", helper: "Layered, composable modules" },
  { label: "Concurrent Writers", value: "8", helper: "x throughput via MVCC" },
  { label: "Unsafe Blocks", value: "0", helper: "Pure safe Rust throughout" },
  { label: "SQL Dialect", value: "100", helper: "% SQLite-compatible" },
];

// ---- 4. Features ----------------------------------------------------------

export const features: Feature[] = [
  {
    title: "Concurrent Writers",
    description: (
      <>
        <FrankenJargon term="mvcc" /> lets multiple writers operate simultaneously. It isolates
        transactions at the page level, completely eliminating the SQLITE_BUSY wall.
      </>
    ),
    icon: "cpu",
  },
  {
    title: "Self-Healing Storage",
    description: (
      <>
        <FrankenJargon term="raptorq" /> fountain codes protect every page with{" "}
        <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon>. Bit rot and disk
        corruption trigger automatic recovery. No external backups needed.
      </>
    ),
    icon: "shield",
  },
  {
    title: "File Compatibility",
    description: (
      <>
        Reads and writes standard .sqlite3 files directly. Drop-in migration from C SQLite. No data
        conversion, no schema changes.
      </>
    ),
    icon: "blocks",
  },
  {
    title: "Zero Unsafe",
    description: (
      <>
        Every line of the 26-crate workspace is pure safe Rust. With{" "}
        <FrankenJargon term="zero-unsafe" />, memory bugs are structurally impossible.
      </>
    ),
    icon: "lock",
  },
  {
    title: "Full SQL Support",
    description: (
      <>
        Joins, subqueries, CTEs, window functions, triggers, and views. Hand-written recursive
        descent parser feeds a custom <FrankenJargon term="vdbe" /> bytecode interpreter.
      </>
    ),
    icon: "terminal",
  },
  {
    title: "Extension Ecosystem",
    description: (
      <>
        Custom functions, virtual tables, and collations. FTS5 full-text search, JSON1, R-tree
        spatial indexes, and session/changeset tracking ship out of the box.
      </>
    ),
    icon: "sparkles",
  },
  {
    title: "Time-Travel Queries",
    description: (
      <>
        The <FrankenJargon term="mvcc" /> version chain holds full history. Query the database at
        any past point via <code className="text-teal-300 text-xs">FOR SYSTEM_TIME AS OF</code>. No
        snapshots, no replicas, no forks.
      </>
    ),
    icon: "activity",
  },
  {
    title: "Dual Storage Modes",
    description: (
      <>
        Standard .sqlite3 compatibility, plus a native <FrankenJargon term="ecs" /> format with
        append-only commits, <FrankenJargon term="content-addressed" /> pages, and continuous{" "}
        <FrankenJargon term="raptorq" /> parity generation.
      </>
    ),
    icon: "layers",
  },
  {
    title: "Page-Level Encryption",
    description: (
      <>
        <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> encrypts each 4KB page
        independently. <FrankenJargon term="dek-kek">Envelope encryption</FrankenJargon> makes
        re-keying instant: change the passphrase without re-encrypting a single page.
      </>
    ),
    icon: "keyRound",
  },
  {
    title: "Transaction Observability",
    description: (
      <>
        Built-in PRAGMAs surface transaction lifecycle stats, anti-pattern detection, and{" "}
        <FrankenJargon term="timeline-profiling">
          Chrome DevTools-compatible timeline JSON
        </FrankenJargon>
        . No external APM required.
      </>
    ),
    icon: "barChart",
  },
  {
    title: "Adaptive Indexing",
    description: (
      <>
        <FrankenJargon term="learned-index">Learned indexes</FrankenJargon> replace B-tree traversal
        with model inference.{" "}
        <FrankenJargon term="database-cracking">Database cracking</FrankenJargon> builds indexes on
        the fly from your query patterns. Zero configuration.
      </>
    ),
    icon: "globe",
  },
  {
    title: "Structured Concurrency",
    description: (
      <>
        Every async operation runs within a{" "}
        <FrankenJargon term="structured-concurrency">capability context (Cx)</FrankenJargon> that
        carries cancellation, budgets, and tracing. No orphaned tasks. No leaked resources.
      </>
    ),
    icon: "workflow",
  },
];

// ---- 5. Crate workspace ---------------------------------------------------

export const crates: { name: string; description: ReactNode }[] = [
  { name: "fsqlite", description: "Public API facade" },
  { name: "fsqlite-ast", description: "SQL abstract syntax tree node types" },
  {
    name: "fsqlite-btree",
    description: (
      <>
        B-tree storage engine handling the fundamental <FrankenJargon term="wal">WAL</FrankenJargon>{" "}
        layout
      </>
    ),
  },
  { name: "fsqlite-c-api", description: "SQLite C API compatibility shim for drop-in replacement" },
  { name: "fsqlite-cli", description: "Interactive SQL shell" },
  {
    name: "fsqlite-core",
    description: "Core engine: connection, prepare, schema, DDL/DML codegen",
  },
  { name: "fsqlite-e2e", description: "End-to-end differential testing and benchmark harness" },
  { name: "fsqlite-error", description: "Structured error types" },
  { name: "fsqlite-ext-fts3", description: "FTS3/FTS4 full-text search extension" },
  { name: "fsqlite-ext-fts5", description: "FTS5 full-text search extension" },
  { name: "fsqlite-ext-icu", description: "ICU collation extension" },
  { name: "fsqlite-ext-json", description: "JSON1 functions and virtual tables" },
  {
    name: "fsqlite-ext-misc",
    description: "Miscellaneous extensions: generate_series, carray, dbstat, dbpage",
  },
  { name: "fsqlite-ext-rtree", description: "R-tree and geopoly spatial index extension" },
  { name: "fsqlite-ext-session", description: "Session, changeset, and patchset extension" },
  { name: "fsqlite-func", description: "Built-in scalar, aggregate, and window functions" },
  { name: "fsqlite-harness", description: "Conformance test runner and golden file comparison" },
  {
    name: "fsqlite-mvcc",
    description: (
      <>
        <FrankenJargon term="mvcc" /> page-level versioning for concurrent writers
      </>
    ),
  },
  {
    name: "fsqlite-observability",
    description: "Conflict analytics and observability infrastructure",
  },
  { name: "fsqlite-pager", description: "Page cache and journal management" },
  { name: "fsqlite-parser", description: "Hand-written recursive descent SQL parser" },
  {
    name: "fsqlite-planner",
    description: "Query planner: name resolution, WHERE analysis, join ordering",
  },
  { name: "fsqlite-types", description: "Core type definitions" },
  {
    name: "fsqlite-vdbe",
    description: (
      <>
        <FrankenJargon term="vdbe" /> bytecode interpreter
      </>
    ),
  },
  { name: "fsqlite-vfs", description: "Virtual filesystem abstraction layer" },
  {
    name: "fsqlite-wal",
    description: (
      <>
        <FrankenJargon term="wal" /> with snapshot journaling
      </>
    ),
  },
];

// ---- 6. Comparison table --------------------------------------------------

export const comparisonData: ComparisonRow[] = [
  {
    feature: "Concurrent Writers",
    frankensqlite: "First-class",
    csqlite: "Single writer",
    libsql: "Enhanced WAL",
    duckdb: "First-class",
  },
  {
    feature: "Memory Safety",
    frankensqlite: "Enforced",
    csqlite: "Manual",
    libsql: "Manual",
    duckdb: "Manual",
  },
  {
    feature: "Self-Healing Storage",
    frankensqlite: "Built-in",
    csqlite: "No",
    libsql: "No",
    duckdb: "No",
  },
  {
    feature: "Pure Safe Code",
    frankensqlite: "Yes",
    csqlite: "N/A (C)",
    libsql: "N/A (C)",
    duckdb: "N/A (C++)",
  },
  {
    feature: "MVCC",
    frankensqlite: "Page-level",
    csqlite: "WAL-only",
    libsql: "Extended WAL",
    duckdb: "Row-level",
  },
  {
    feature: "Full SQL Dialect",
    frankensqlite: "First-class",
    csqlite: "First-class",
    libsql: "First-class",
    duckdb: "Extended",
  },
  {
    feature: "Extension API",
    frankensqlite: "First-class",
    csqlite: "First-class",
    libsql: "First-class",
    duckdb: "First-class",
  },
  {
    feature: "SQLite File Compat",
    frankensqlite: "First-class",
    csqlite: "Native",
    libsql: "Native",
    duckdb: "No",
  },
  {
    feature: "Analytical Queries",
    frankensqlite: "Basic",
    csqlite: "Basic",
    libsql: "Basic",
    duckdb: "First-class",
  },
  {
    feature: "Encryption at Rest",
    frankensqlite: "Built-in",
    csqlite: "SEE (paid)",
    libsql: "No",
    duckdb: "No",
  },
  {
    feature: "Production Maturity",
    frankensqlite: "Early",
    csqlite: "20+ years",
    libsql: "Growing",
    duckdb: "Mature",
  },
  {
    feature: "Time-Travel Queries",
    frankensqlite: "Built-in",
    csqlite: "No",
    libsql: "No",
    duckdb: "No",
  },
  {
    feature: "Conflict Resolution",
    frankensqlite: "Multi-strategy merge",
    csqlite: "Abort + retry",
    libsql: "Abort + retry",
    duckdb: "Row-level MVCC",
  },
  {
    feature: "Storage Formats",
    frankensqlite: "sqlite3 + ECS",
    csqlite: "sqlite3",
    libsql: "sqlite3",
    duckdb: "Proprietary",
  },
  {
    feature: "Adaptive Indexing",
    frankensqlite: "Learned + cracking",
    csqlite: "Manual only",
    libsql: "Manual only",
    duckdb: "ART indexes",
  },
  {
    feature: "Page Cache",
    frankensqlite: "ARC (self-tuning)",
    csqlite: "LRU",
    libsql: "LRU",
    duckdb: "Custom",
  },
  {
    feature: "Structured Concurrency",
    frankensqlite: "Cx + budgets",
    csqlite: "N/A",
    libsql: "N/A",
    duckdb: "Thread pool",
  },
];

// ---- 7. Code example ------------------------------------------------------

export const codeExample = `use fsqlite::Connection;
use fsqlite_error::Result;
use fsqlite_types::value::SqliteValue;

fn main() -> Result<()> {
    let db = Connection::open("app.db")?;

    db.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE
        )",
    )?;

    db.execute_with_params(
        "INSERT INTO users (name, email) VALUES (?1, ?2)",
        &[
            SqliteValue::Text("Alice".to_owned()),
            SqliteValue::Text("alice@example.com".to_owned()),
        ],
    )?;

    let stmt = db.prepare("SELECT id, name FROM users WHERE name = ?1")?;
    let rows = stmt.query_with_params(
        &[SqliteValue::Text("Alice".to_owned())],
    )?;

    for row in &rows {
        let id = row.get(0).expect("id column");
        let name = row.get(1).expect("name column");
        println!("Found: {id:?} \u2014 {name:?}");
    }

    Ok(())
}`;

// ---- 7b. Advanced code examples -------------------------------------------

export const concurrentWritersExample = `use fsqlite::Connection;
use fsqlite_types::value::SqliteValue;
use std::thread;

fn main() -> fsqlite_error::Result<()> {
    let db = Connection::open("concurrent.db")?;
    db.execute("CREATE TABLE counters (id INTEGER PRIMARY KEY, val INTEGER)")?;
    db.execute("INSERT INTO counters VALUES (1, 0), (2, 0), (3, 0), (4, 0)")?;

    let handles: Vec<_> = (1..=4).map(|id| {
        thread::spawn(move || {
            let conn = Connection::open("concurrent.db").unwrap();
            for _ in 0..1000 {
                conn.execute_with_params(
                    "UPDATE counters SET val = val + 1 WHERE id = ?1",
                    &[SqliteValue::Integer(id)],
                ).unwrap();
            }
        })
    }).collect();

    for h in handles { h.join().unwrap(); }
    // Each counter is exactly 1000 — no SQLITE_BUSY, no lost updates.
    Ok(())
}`;

export const timeTravelExample = `use fsqlite::Connection;

fn main() -> fsqlite_error::Result<()> {
    let db = Connection::open("history.db")?;
    db.execute("CREATE TABLE prices (item TEXT, price REAL)")?;
    db.execute("INSERT INTO prices VALUES ('widget', 9.99)")?;

    // Record the commit sequence number
    let csn_before = db.query_scalar("SELECT fsqlite_current_csn()")?;

    db.execute("UPDATE prices SET price = 14.99 WHERE item = 'widget'")?;

    // Query the current state
    let current = db.prepare("SELECT price FROM prices WHERE item = 'widget'")?;
    // => 14.99

    // Time-travel: query the database as it was before the update
    let historical = db.prepare(
        "SELECT price FROM prices FOR SYSTEM_TIME AS OF ?1 WHERE item = 'widget'",
    )?;
    let rows = historical.query_with_params(&[csn_before])?;
    // => 9.99 — the price before the update

    Ok(())
}`;

export const ecsEncryptionExample = `use fsqlite::Connection;
use fsqlite_types::value::SqliteValue;

fn main() -> fsqlite_error::Result<()> {
    let db = Connection::open("secure.db")?;

    // Switch to native ECS format for maximum durability
    db.execute("PRAGMA fsqlite.mode = native")?;

    // Enable page-level encryption (XChaCha20-Poly1305 + Argon2id KDF)
    db.execute("PRAGMA fsqlite.key = 'hunter2-but-stronger'")?;

    // Configure RaptorQ repair symbol ratio (default: 0.1 = 10% overhead)
    db.execute("PRAGMA fsqlite.repair_ratio = 0.2")?; // 20% for extra safety

    // Business as usual — the API is identical
    db.execute("CREATE TABLE secrets (id INTEGER PRIMARY KEY, data BLOB)")?;
    db.execute_with_params(
        "INSERT INTO secrets (data) VALUES (?1)",
        &[SqliteValue::Blob(b"classified".to_vec())],
    )?;

    // Every page is encrypted at rest + protected by RaptorQ repair symbols.
    // Even if the disk suffers corruption, data is recoverable.
    Ok(())
}`;

// ---- 8. Changelog / development timeline ----------------------------------

export const changelog: ChangelogEntry[] = [
  {
    period: "Phase 1",
    title: "Foundation",
    items: [
      "Defined core types and error handling across the workspace",
      "Implemented page format parser for .sqlite3 files",
      "Built B-tree reader with copy-on-write page support",
      "Established 26-crate workspace layout and CI pipeline",
    ],
  },
  {
    period: "Phase 2",
    title: "SQL Engine",
    items: [
      "Wrote tokenizer and recursive-descent SQL parser",
      "Designed full AST representation for SELECT, INSERT, UPDATE, DELETE",
      "Implemented query planner with cost-based optimization",
      <span key="1">
        Built <FrankenJargon term="vdbe" /> bytecode compiler and interpreter loop
      </span>,
    ],
  },
  {
    period: "Phase 3",
    title: "Storage",
    items: [
      <span key="1">
        Implemented <FrankenJargon term="wal" /> with checkpointing
      </span>,
      "Built page cache with configurable buffer pool sizing",
      "Added crash recovery and rollback journal support",
      "Integrated file locking and concurrency primitives",
    ],
  },
  {
    period: "Phase 4",
    title: "MVCC + RaptorQ",
    items: [
      <span key="1">
        Implemented <FrankenJargon term="mvcc" /> with snapshot isolation
      </span>,
      "Enabled concurrent writers \u2014 up to 8x throughput improvement",
      <span key="3">
        Integrated <FrankenJargon term="raptorq" /> fountain codes for page-level error correction
      </span>,
      "Added automatic self-healing for bit rot and disk corruption",
    ],
  },
  {
    period: "Phase 5",
    title: "Polish",
    items: [
      "Built interactive CLI shell with syntax highlighting and autocomplete",
      "Implemented extension API for custom functions and virtual tables",
      "Added FTS5-compatible full-text search engine",
      "Shipped JSON1-compatible functions and path queries",
      "Created SQLite compatibility test suite with 10,000+ test cases",
    ],
  },
];

// ---- 9. Screenshots / showcase gallery ------------------------------------

export const screenshots: Screenshot[] = [
  {
    src: "/images/frankensqlite_diagram.webp",
    alt: "FrankenSQLite 26-crate architecture diagram",
    title: "Architecture Diagram",
  },
  {
    src: "/images/frankensqlite_illustration.webp",
    alt: "FrankenSQLite monster illustration",
    title: "FrankenSQLite Illustration",
  },
];

// ---- 10. Architecture layers (shared between home + architecture page) -----

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
    crates: ["fsqlite-types", "fsqlite-error", "fsqlite-vfs"],
    description:
      "Core type definitions, structured error types, and the virtual filesystem abstraction layer. The bedrock that every other layer depends on.",
  },
  {
    name: "Storage",
    iconName: "hardDrive",
    color: "text-blue-400",
    crates: ["fsqlite-btree", "fsqlite-pager", "fsqlite-wal"],
    description: (
      <>
        B-tree storage engine with{" "}
        <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> and{" "}
        <FrankenJargon term="learned-index">learned indexes</FrankenJargon>.{" "}
        <FrankenJargon term="arc-cache">ARC</FrankenJargon> page cache with{" "}
        <FrankenJargon term="cooling-protocol" />. Write-ahead logging (<FrankenJargon term="wal" />
        ) with per-writer lanes and checkpointing.
      </>
    ),
  },
  {
    name: "Concurrency & Durability",
    iconName: "shield",
    color: "text-amber-400",
    crates: ["fsqlite-mvcc", "fsqlite-observability"],
    description: (
      <>
        Page-level <FrankenJargon term="mvcc" /> with <FrankenJargon term="ssi">SSI</FrankenJargon>{" "}
        validation via the <FrankenJargon term="witness-plane" />.{" "}
        <FrankenJargon term="xor-delta">XOR delta</FrankenJargon> version chains for compact
        storage.{" "}
        <FrankenJargon term="write-coordinator">Single-threaded write coordinator</FrankenJargon>{" "}
        for lock-free commit sequencing. <FrankenJargon term="bocpd" /> regime detection auto-tunes
        GC heuristics.{" "}
        <FrankenJargon term="timeline-profiling">Chrome DevTools-compatible</FrankenJargon>{" "}
        transaction timelines.
      </>
    ),
  },
  {
    name: "SQL Engine",
    iconName: "database",
    color: "text-purple-400",
    crates: [
      "fsqlite-parser",
      "fsqlite-ast",
      "fsqlite-planner",
      "fsqlite-vdbe",
      "fsqlite-core",
      "fsqlite-func",
    ],
    description: (
      <>
        Hand-written recursive descent parser, full AST, cost-based query planner with join
        ordering, and <FrankenJargon term="vdbe" /> bytecode interpreter.{" "}
        <FrankenJargon term="deterministic-rebase">Deterministic rebase</FrankenJargon> in the AST
        layer enables safe transaction replay. 150+ built-in scalar, aggregate, and window
        functions.
      </>
    ),
  },
  {
    name: "Extensions",
    iconName: "zap",
    color: "text-rose-400",
    crates: [
      "fsqlite-ext-fts3",
      "fsqlite-ext-fts5",
      "fsqlite-ext-icu",
      "fsqlite-ext-json",
      "fsqlite-ext-misc",
      "fsqlite-ext-rtree",
      "fsqlite-ext-session",
    ],
    description:
      "FTS3/FTS4 and FTS5 full-text search, ICU collation, JSON1 functions and virtual tables, R-tree spatial indexing, session/changeset support, and miscellaneous extensions.",
  },
  {
    name: "Integration",
    iconName: "cpu",
    color: "text-teal-300",
    crates: ["fsqlite", "fsqlite-c-api", "fsqlite-cli", "fsqlite-e2e", "fsqlite-harness"],
    description: (
      <>
        Public API facade, C API compatibility shim, interactive SQL shell with syntax highlighting.{" "}
        <FrankenJargon term="sheaf-theoretic">Sheaf-theoretic</FrankenJargon> conformance harness
        with <FrankenJargon term="conformal-prediction">conformal prediction</FrankenJargon>{" "}
        performance bounds.
      </>
    ),
  },
];

// ---- 11. FAQ --------------------------------------------------------------

export const faq: { question: string; answer: ReactNode }[] = [
  {
    question: "Why FrankenSQLite?",
    answer: (
      <>
        SQLite is single-writer, has no self-healing, and is written in C. FrankenSQLite is a
        clean-room Rust reimplementation that adds <FrankenJargon term="mvcc" /> (concurrent
        writers), <FrankenJargon term="raptorq" /> (self-healing pages), and{" "}
        <FrankenJargon term="zero-unsafe" /> (compiler-enforced memory safety). Same SQL dialect,
        fundamentally different engine.
      </>
    ),
  },
  {
    question: "Is it a drop-in replacement for SQLite?",
    answer:
      "It reads and writes standard .sqlite3 files and supports the full SQL dialect. The Rust API is different from the C API, but migration is straightforward.",
  },
  {
    question: "How does MVCC work?",
    answer: (
      <>
        FrankenSQLite maintains multiple versions of each page. Readers see a consistent snapshot
        while writers operate independently, resolving collisions with <FrankenJargon term="fcw" />.
        No more SQLITE_BUSY errors.
      </>
    ),
  },
  {
    question: "What is RaptorQ self-healing?",
    answer: (
      <>
        <FrankenJargon term="raptorq" /> fountain codes mathematically generate redundant repair
        symbols. If bit rot or disk corruption occurs, the database can automatically reconstruct
        damaged pages.
      </>
    ),
  },
  {
    question: "What are the storage modes?",
    answer: (
      <>
        FrankenSQLite supports two storage modes. Compatibility mode reads and writes standard
        .sqlite3 files for direct migration from C SQLite. Native mode uses the{" "}
        <FrankenJargon term="ecs" /> format with append-only commits,{" "}
        <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>-protected pages, and built-in{" "}
        <FrankenJargon term="time-travel">time-travel queries</FrankenJargon>. Switch between them
        with <code className="text-teal-300 text-xs">PRAGMA fsqlite.mode</code>.
      </>
    ),
  },
  {
    question: "What is the ECS format?",
    answer: (
      <>
        <FrankenJargon term="ecs">ECS (Erasure-Coded Stream)</FrankenJargon> is FrankenSQLite&apos;s
        native storage format. It uses <FrankenJargon term="content-addressed" /> BLAKE3 hashes,
        append-only commits, and <FrankenJargon term="raptorq" /> repair symbols for continuous
        parity. The <FrankenJargon term="systematic-layout" /> means normal reads are zero-copy, and
        decoding only happens when corruption is detected.
      </>
    ),
  },
  {
    question: "How does the safe merge ladder work?",
    answer: (
      <>
        The <FrankenJargon term="safe-merge-ladder" /> tries four strategies in order: (1) intent
        replay (re-applying the logical operation), (2) <FrankenJargon term="foata" /> merge
        (canonical reordering of independent writes), (3) <FrankenJargon term="xor-delta" /> merge
        (combining byte-level diffs), and (4) abort as a last resort. Most real-world
        &ldquo;conflicts&rdquo; are safely merged without aborting.
      </>
    ),
  },
  {
    question: "What are time-travel queries?",
    answer: (
      <>
        <FrankenJargon term="time-travel">Time-travel queries</FrankenJargon> let you inspect the
        database at any past point using{" "}
        <code className="text-teal-300 text-xs">FOR SYSTEM_TIME AS OF</code> with a commit sequence
        number or timestamp. The <FrankenJargon term="mvcc" /> version chain holds full history,
        meaning no snapshots, forks, or replicas are needed.
      </>
    ),
  },
  {
    question: "Does FrankenSQLite use any unsafe Rust?",
    answer: (
      <>
        No. The entire 26-crate workspace enforces <FrankenJargon term="zero-unsafe" /> via{" "}
        <code className="text-teal-300 text-xs">#![forbid(unsafe_code)]</code>. This structurally
        prevents buffer overflows, use-after-free, double-free, and data races. The{" "}
        <FrankenJargon term="newtype-pattern" /> adds further compile-time safety by preventing
        accidental mixing of PageNumber with TxnId.
      </>
    ),
  },
  {
    question: "How does encryption work?",
    answer: (
      <>
        Every 4KB page is encrypted independently with{" "}
        <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon>. The page number is bound as
        authenticated data, so moving ciphertext between page slots is detected and rejected. Keys
        use a <FrankenJargon term="dek-kek">DEK/KEK envelope</FrankenJargon>, so changing the
        passphrase rewraps a single 32-byte key instead of re-encrypting every page.
      </>
    ),
  },
  {
    question: "What are learned indexes and database cracking?",
    answer: (
      <>
        <FrankenJargon term="learned-index">Learned indexes</FrankenJargon> fit a piecewise linear
        model to the key distribution, replacing B-tree traversal with arithmetic prediction plus a
        bounded scan. <FrankenJargon term="database-cracking">Database cracking</FrankenJargon>{" "}
        partitions column data in-place as queries arrive, so the index builds itself from the
        workload. Together they provide adaptive, zero-admin indexing.
      </>
    ),
  },
  {
    question: "How does the page cache work?",
    answer: (
      <>
        FrankenSQLite uses an <FrankenJargon term="arc-cache">ARC</FrankenJargon> page cache that
        self-tunes the balance between recency and frequency. On top of that, a{" "}
        <FrankenJargon term="cooling-protocol" /> (HOT/COOLING/COLD) prevents full-table scans from
        thrashing the buffer pool. Hot B-tree pages use{" "}
        <FrankenJargon term="swizzle-pointer">swizzle pointers</FrankenJargon> to bypass the cache
        lookup entirely.
      </>
    ),
  },
  {
    question: "Is it production ready?",
    answer:
      "FrankenSQLite is under active development. The architecture is solid but it should be evaluated carefully for production workloads. Contributions welcome!",
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
  subtitle:
    "A high-velocity AI engineering ecosystem designed for building systems like FrankenSQLite.",
  description:
    "FrankenSQLite wasn't built manually. It was architected and implemented through a recursive feedback loop of specialized AI agents, each handling a different layer of the 26-crate workspace.",
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
