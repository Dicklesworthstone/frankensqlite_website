import { BookOpen, Code, Database, Rocket, Settings, Terminal, Zap } from "lucide-react";
import type { Metadata } from "next";
import { FrankenContainer } from "@/components/franken-elements";
import FrankenGlitch from "@/components/franken-glitch";
import { FrankenJargon } from "@/components/franken-jargon";
import RustCodeBlock from "@/components/rust-code-block";
import {
  codeExample,
  concurrentWritersExample,
  ecsEncryptionExample,
  faq,
  timeTravelExample,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Install FrankenSQLite and start building with MVCC concurrency, RaptorQ self-healing, and zero unsafe Rust.",
};

export default function GettingStartedPage() {
  return (
    <main id="main-content" className="relative">
      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-8">
            <Rocket className="h-3 w-3" />
            Quick_Start
          </div>
          <FrankenGlitch trigger="always" intensity="low">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
              Get Started
            </h1>
          </FrankenGlitch>
          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            Add FrankenSQLite to your Rust project and start building with MVCC concurrency and
            self-healing storage in minutes.
          </p>
        </div>
      </section>

      {/* INSTALLATION */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Terminal className="h-5 w-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Installation
            </h2>
          </div>

          <p className="text-slate-400 font-medium mb-6">
            FrankenSQLite is published on crates.io. Add it to your project with Cargo:
          </p>

          <FrankenContainer
            withPulse={true}
            accentColor="#14b8a6"
            className="p-1 md:p-2 bg-black/40 mb-8"
          >
            <RustCodeBlock
              code={`# Add to your Cargo.toml
cargo add fsqlite

# Or add manually:
# [dependencies]
# fsqlite = "0.1"`}
              title="terminal"
            />
          </FrankenContainer>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 mt-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
              Requirements
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <div className="mt-2 h-1 w-1 rounded-full bg-teal-500 shrink-0" />
                <span>Rust nightly (edition 2024, rust-version 1.85+)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-2 h-1 w-1 rounded-full bg-teal-500 shrink-0" />
                <span>No system dependencies. Pure Rust, no C compiler needed</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-2 h-1 w-1 rounded-full bg-teal-500 shrink-0" />
                <span>Works on Linux, macOS, and Windows</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* QUICKSTART CODE */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Database className="h-5 w-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Quickstart
            </h2>
          </div>

          <p className="text-slate-400 font-medium mb-6">
            Open a database, create a table, insert data, and query, all with familiar Rust
            patterns:
          </p>

          <FrankenContainer
            withPulse={true}
            accentColor="#14b8a6"
            className="p-1 md:p-2 bg-black/40"
          >
            <RustCodeBlock code={codeExample} title="examples/quickstart.rs" />
          </FrankenContainer>
        </div>
      </section>

      {/* CLI USAGE */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">CLI Shell</h2>
          </div>

          <p className="text-slate-400 font-medium mb-6">
            FrankenSQLite ships with an interactive CLI shell with syntax highlighting and
            autocomplete:
          </p>

          <FrankenContainer
            withPulse={true}
            accentColor="#14b8a6"
            className="p-1 md:p-2 bg-black/40 mb-8"
          >
            <RustCodeBlock
              code={`# Install the CLI
cargo install fsqlite-cli

# Open or create a database
fsqlite my_database.db

# Run queries interactively
fsqlite> CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
fsqlite> INSERT INTO users VALUES (1, 'Alice');
fsqlite> SELECT * FROM users;
-- 1 | Alice

# Output modes
fsqlite> .mode json
fsqlite> SELECT * FROM users;
-- [{"id": 1, "name": "Alice"}]

fsqlite> .mode csv
fsqlite> SELECT * FROM users;
-- id,name
-- 1,Alice`}
              title="terminal"
            />
          </FrankenContainer>
        </div>
      </section>

      {/* CONFIGURATION */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Settings className="h-5 w-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Configuration
            </h2>
          </div>

          <p className="text-slate-400 font-medium mb-6">
            Configure storage modes, <FrankenJargon term="aead">encryption</FrankenJargon>, and{" "}
            <FrankenJargon term="timeline-profiling">transaction observability</FrankenJargon> via
            PRAGMAs:
          </p>

          <FrankenContainer
            withPulse={true}
            accentColor="#14b8a6"
            className="p-1 md:p-2 bg-black/40 mb-8"
          >
            <RustCodeBlock
              code={`-- Storage modes: compatibility (default) or native ECS
PRAGMA fsqlite.mode = compatibility;  -- Standard .sqlite3 format
PRAGMA fsqlite.mode = native;         -- Erasure-Coded Stream format

-- Page-level encryption (XChaCha20-Poly1305)
PRAGMA fsqlite.key = 'your-secret-key';

-- Transaction observability
PRAGMA fsqlite_txn_stats;             -- Lifecycle counters
PRAGMA fsqlite_transactions;          -- Active transaction details
PRAGMA fsqlite_txn_advisor;           -- Anti-pattern detection
PRAGMA fsqlite_txn_timeline_json;     -- Chrome DevTools timeline

-- Tune advisor thresholds
PRAGMA fsqlite.txn_advisor_long_txn_ms = 5000;
PRAGMA fsqlite.txn_advisor_large_read_ops = 256;`}
              title="terminal"
            />
          </FrankenContainer>
        </div>
      </section>

      {/* ADVANCED EXAMPLES */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <Code className="h-5 w-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Advanced Examples
            </h2>
          </div>

          <p className="text-slate-400 font-medium mb-8">
            These examples showcase FrankenSQLite&apos;s unique capabilities beyond standard SQLite.
          </p>

          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-black text-white mb-2">Concurrent Writers</h3>
              <p className="text-sm text-slate-400 mb-4">
                Four threads writing simultaneously. <FrankenJargon term="mvcc" /> eliminates
                SQLITE_BUSY entirely.
              </p>
              <FrankenContainer
                withPulse={true}
                accentColor="#14b8a6"
                className="p-1 md:p-2 bg-black/40"
              >
                <RustCodeBlock
                  code={concurrentWritersExample}
                  title="examples/concurrent_writers.rs"
                />
              </FrankenContainer>
            </div>

            <div>
              <h3 className="text-lg font-black text-white mb-2">Time-Travel Queries</h3>
              <p className="text-sm text-slate-400 mb-4">
                <FrankenJargon term="time-travel">Time-travel queries</FrankenJargon> inspect the
                database at any past point using commit sequence numbers.
              </p>
              <FrankenContainer
                withPulse={true}
                accentColor="#14b8a6"
                className="p-1 md:p-2 bg-black/40"
              >
                <RustCodeBlock code={timeTravelExample} title="examples/time_travel.rs" />
              </FrankenContainer>
            </div>

            <div>
              <h3 className="text-lg font-black text-white mb-2">ECS Mode + Encryption</h3>
              <p className="text-sm text-slate-400 mb-4">
                Native <FrankenJargon term="ecs" /> storage with{" "}
                <FrankenJargon term="dek-kek">envelope encryption</FrankenJargon> and configurable{" "}
                <FrankenJargon term="raptorq" /> repair ratios.
              </p>
              <FrankenContainer
                withPulse={true}
                accentColor="#14b8a6"
                className="p-1 md:p-2 bg-black/40"
              >
                <RustCodeBlock code={ecsEncryptionExample} title="examples/ecs_encryption.rs" />
              </FrankenContainer>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 pb-32">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">FAQ</h2>
          </div>

          <div className="space-y-6">
            {faq.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-teal-500/20 hover:bg-white/[0.04]"
              >
                <h3 className="text-lg font-black text-white mb-3">{item.question}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
