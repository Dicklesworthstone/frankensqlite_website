import {
  AlertTriangle,
  BookOpen,
  Code,
  Database,
  Package,
  Rocket,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FrankenContainer, StatusBadge } from "@/components/franken-elements";
import FrankenGlitch from "@/components/franken-glitch";
import { FrankenJargon } from "@/components/franken-jargon";
import RustCodeBlock from "@/components/rust-code-block";
import {
  cargoSetupExample,
  cliExample,
  codeExample,
  concurrentWritersExample,
  engineSnapshot,
  faq,
  pragmaExample,
  timeTravelExample,
  windowsInstallExample,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Install the fsqlite shell or add the fsqlite crate, open a database, and run concurrent writers. Includes the async API, CLI, PRAGMAs and current limitations.",
};

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
        {icon}
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{children}</h2>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-2 h-1 w-1 rounded-full bg-teal-500 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

const inlineCode = "text-teal-300 text-xs";

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
            v{engineSnapshot.version} &middot; {engineSnapshot.releasedOn}
          </div>
          <FrankenGlitch trigger="always" intensity="low">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
              Get Started
            </h1>
          </FrankenGlitch>
          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            Two ways in: the <code className="text-teal-300">fsqlite</code> shell, if you want to
            poke at a database file, or the <code className="text-teal-300">fsqlite</code> crate, if
            you want it inside a Rust program. Both work against ordinary SQLite files.
          </p>
        </div>
      </section>

      {/* CLI */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<Terminal className="h-5 w-5" />}>The fsqlite shell</SectionHeading>

          <p className="text-slate-400 font-medium mb-6">
            The installer downloads a signed release binary, checks its SHA-256 against the signed
            manifest (and the minisign signature, if <code className={inlineCode}>minisign</code>{" "}
            is installed), then runs a version check and a SQL smoke test before it reports success.
            Linux builds are fully static, so the same binary works on glibc and musl systems.
          </p>

          <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40 mb-6">
            <RustCodeBlock code={cliExample} title="terminal" />
          </FrankenContainer>

          <p className="text-sm text-slate-500 mb-3">Windows (PowerShell):</p>
          <FrankenContainer withPulse={false} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40 mb-8">
            <RustCodeBlock code={windowsInstallExample} title="powershell" />
          </FrankenContainer>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
              What the shell does today
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <Bullet>
                Multi-line statements, an interactive REPL, piped batch mode, and{" "}
                <code className={inlineCode}>-c</code> / <code className={inlineCode}>--command</code>{" "}
                for one-shot queries.
              </Bullet>
              <Bullet>
                Dot commands: <code className={inlineCode}>.open</code>,{" "}
                <code className={inlineCode}>.tables</code>, <code className={inlineCode}>.schema</code>,{" "}
                <code className={inlineCode}>.dump</code>, <code className={inlineCode}>.read</code>,{" "}
                <code className={inlineCode}>.mode</code> (list, column, csv, tabs, line, quote),{" "}
                <code className={inlineCode}>.headers</code>, <code className={inlineCode}>.timer</code>.
              </Bullet>
              <Bullet>
                Not yet: persistent history, tab completion, and most of the less common{" "}
                <code className={inlineCode}>sqlite3</code> dot commands.
              </Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* LIBRARY */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<Package className="h-5 w-5" />}>Add the crate</SectionHeading>

          <p className="text-slate-400 font-medium mb-6">
            The engine is published on crates.io as <code className="text-teal-300">fsqlite</code>{" "}
            (plus the <code className="text-teal-300">fsqlite-*</code> crates it is built from). Its
            API is async and runs on{" "}
            <FrankenJargon term="structured-concurrency">asupersync</FrankenJargon>, so you add that
            too:
          </p>

          <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40 mb-8">
            <RustCodeBlock code={cargoSetupExample} title="terminal" />
          </FrankenContainer>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
              Requirements
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <Bullet>
                Nightly Rust. The workspace pins a dated nightly in{" "}
                <code className={inlineCode}>rust-toolchain.toml</code> (edition 2024) and uses at
                least one unstable feature, so stable toolchains will not build it.
              </Bullet>
              <Bullet>
                Linux, macOS or Windows. Prebuilt CLI binaries are published for all three.
              </Bullet>
              <Bullet>
                The default features include FTS5, JSON1, R-tree, ICU and the misc extensions. Turn
                off <code className={inlineCode}>default-features</code> and opt back in to slim
                the build.
              </Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* QUICKSTART CODE */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<Database className="h-5 w-5" />}>Quickstart</SectionHeading>

          <p className="text-slate-400 font-medium mb-6">
            Open a file, create a table, insert with parameters, read it back. Every call returns a
            future, so the program builds a single-threaded runtime and blocks on it.
          </p>

          <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40 mb-8">
            <RustCodeBlock code={codeExample} title="src/main.rs" />
          </FrankenContainer>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-teal-400 mb-3">
              Things that will bite you
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <Bullet>
                <code className={inlineCode}>Connection</code> is{" "}
                <code className={inlineCode}>!Send</code> and <code className={inlineCode}>!Sync</code>
                . Keep each one on the thread that opened it. For several connections on one thread,
                use asupersync&apos;s local spawn APIs.
              </Bullet>
              <Bullet>
                Prepared statements borrow the connection. Drop them before calling{" "}
                <code className={inlineCode}>close()</code>.
              </Bullet>
              <Bullet>
                Finish transactions with <code className={inlineCode}>commit()</code> or{" "}
                <code className={inlineCode}>rollback()</code>. A dropped transaction is rolled back
                before the next statement on that connection runs.
              </Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* CONCURRENT WRITERS */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<Code className="h-5 w-5" />}>Concurrent writers</SectionHeading>

          <p className="text-slate-400 font-medium mb-6">
            This is the reason the project exists. Give each writer its own thread and its own
            connection to the same file. Plain autocommit writes and plain{" "}
            <code className="text-teal-300">BEGIN</code> both run as concurrent transactions by
            default. Writers that land on different pages commit without waiting for each other; when
            two hit the same page, the later committer gets a transient{" "}
            <code className="text-teal-300">SQLITE_BUSY_SNAPSHOT</code> error and should retry.
          </p>

          <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40 mb-8">
            <RustCodeBlock code={concurrentWritersExample} title="src/bin/writers.rs" />
          </FrankenContainer>

          <p className="text-sm text-slate-500 leading-relaxed">
            Several <em>processes</em> writing the same file is a different story: shared-memory
            coordination exists, but MVCC authority is still per process and multi-process support
            is only proven up to the scale the swarm harness has run. Read the{" "}
            <a
              href={engineSnapshot.concurrencyContractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 underline underline-offset-2"
            >
              concurrency contract
            </a>{" "}
            before building on it.
          </p>
        </div>
      </section>

      {/* CONFIGURATION */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<Settings className="h-5 w-5" />}>Useful PRAGMAs</SectionHeading>

          <p className="text-slate-400 font-medium mb-6">
            Beyond the standard SQLite PRAGMAs, these are specific to FrankenSQLite and work in the
            current release. The{" "}
            <FrankenJargon term="timeline-profiling">telemetry PRAGMAs</FrankenJargon> are safe to
            query while a workload is running.
          </p>

          <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40 mb-8">
            <RustCodeBlock code={pragmaExample} title="sql" />
          </FrankenContainer>
        </div>
      </section>

      {/* TIME TRAVEL */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<Zap className="h-5 w-5" />}>
            Time-travel queries <StatusBadge status="partial" className="ml-3 align-middle" />
          </SectionHeading>

          <p className="text-slate-400 font-medium mb-6">
            On an in-memory database, every commit snapshots the state into a ring of up to 256
            entries, and <code className="text-teal-300">FOR SYSTEM_TIME AS OF</code> reads from
            one of them. You can address a snapshot by commit sequence number or by timestamp.
            File-backed databases return an explicit error for now.
          </p>

          <FrankenContainer withPulse={true} accentColor="#14b8a6" className="p-1 md:p-2 bg-black/40">
            <RustCodeBlock code={timeTravelExample} title="sql (:memory:)" />
          </FrankenContainer>
        </div>
      </section>

      {/* NOT YET */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<AlertTriangle className="h-5 w-5" />}>
            What not to rely on yet
          </SectionHeading>

          <div className="space-y-4">
            <div className="rounded-xl border border-orange-400/20 bg-orange-400/[0.03] p-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-base font-black text-white">Encryption</h3>
                <StatusBadge status="dormant" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                <code className={inlineCode}>PRAGMA key</code> parses, returns success, and does
                nothing. Like SQLite, FrankenSQLite ignores PRAGMAs it doesn&apos;t recognize, and
                the encryption code in the pager is not hooked up to one yet. Your database is
                written unencrypted. Use full-disk or filesystem encryption in the meantime.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-base font-black text-white">Automatic corruption repair</h3>
                <StatusBadge status="partial" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                File-backed connections write RaptorQ repair symbols for the WAL to a{" "}
                <code className={inlineCode}>-wal-fec</code> sidecar in the background, but opening
                a damaged database doesn&apos;t use them automatically yet (an explicit{" "}
                <code className={inlineCode}>fsqlite::compat::recovery::repair_and_open</code> exists
                on Unix). Back up your data the same way you would with SQLite.
              </p>
            </div>
            <div className="rounded-xl border border-red-400/20 bg-red-400/[0.03] p-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-base font-black text-white">
                  Two engines on one file at the same time
                </h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                FrankenSQLite and stock SQLite can each open a database the other wrote, but
                don&apos;t run them against the same file concurrently; that combination has a
                data-loss report against it. Checkpoint, close, then hand the file over. For the same
                reason, never let a 0.3.x and a 0.4.x FrankenSQLite share one WAL database.
              </p>
            </div>
            <div className="rounded-xl border border-slate-400/20 bg-slate-400/[0.03] p-6">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-base font-black text-white">
                  <code className="text-slate-200">PRAGMA fsqlite.mode = native</code>
                </h3>
                <StatusBadge status="design" />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Native (ECS) storage is under construction and is not a stable switch on{" "}
                <code className={inlineCode}>Connection</code>. Everything on this page runs in
                compatibility mode, on standard SQLite files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 pb-32">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeading icon={<BookOpen className="h-5 w-5" />}>FAQ</SectionHeading>

          <div className="space-y-6">
            {faq.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-teal-500/20 hover:bg-white/[0.04]"
              >
                <h3 className="text-lg font-black text-white mb-3">{item.question}</h3>
                <div className="text-sm text-slate-400 leading-relaxed">{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
