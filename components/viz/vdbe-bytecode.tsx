"use client";

import { motion } from "framer-motion";
import { Cpu, FileCode, Pause, Play, RotateCcw, TerminalSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface Opcode {
  id: number;
  op: string;
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  desc: string;
}

/**
 * The program shape FrankenSQLite's code generator emits for a full table scan
 * with an equality filter (crates/fsqlite-vdbe/src/codegen.rs:
 * codegen_select + codegen_select_full_scan + emit_where_filter). Simplified:
 * P5 flags and the collation operand on Ne are omitted, and register numbers
 * are illustrative.
 */
const PROGRAM: Opcode[] = [
  {
    id: 0,
    op: "Init",
    p1: "0",
    p2: "13",
    p3: "0",
    p4: "",
    desc: "P2 points past the end, so this engine falls through. (C SQLite jumps to a trailer that starts the transaction.)",
  },
  {
    id: 1,
    op: "Transaction",
    p1: "0",
    p2: "0",
    p3: "0",
    p4: "",
    desc: "Begin a read transaction on the main database (P2 = 0 means read).",
  },
  {
    id: 2,
    op: "OpenRead",
    p1: "0",
    p2: "2",
    p3: "0",
    p4: "users",
    desc: "Open cursor 0 on table 'users', whose B-tree root is page 2.",
  },
  {
    id: 3,
    op: "Rewind",
    p1: "0",
    p2: "11",
    p3: "0",
    p4: "",
    desc: "Move cursor 0 to the first row. If the table is empty, jump to 11.",
  },
  {
    id: 4,
    op: "Column",
    p1: "0",
    p2: "1",
    p3: "2",
    p4: "",
    desc: "Read column 1 (name) of the current row into register 2.",
  },
  {
    id: 5,
    op: "String8",
    p1: "0",
    p2: "3",
    p3: "0",
    p4: "'Alice'",
    desc: "Load the literal 'Alice' into register 3.",
  },
  {
    id: 6,
    op: "IsNull",
    p1: "3",
    p2: "10",
    p3: "0",
    p4: "",
    desc: "If register 3 is NULL, skip this row (jump to 10). `name = NULL` is never true.",
  },
  {
    id: 7,
    op: "Ne",
    p1: "3",
    p2: "10",
    p3: "2",
    p4: "",
    desc: "If register 2 != register 3, skip this row (jump to 10).",
  },
  {
    id: 8,
    op: "Column",
    p1: "0",
    p2: "1",
    p3: "1",
    p4: "",
    desc: "Read name again, this time into the output register 1.",
  },
  {
    id: 9,
    op: "ResultRow",
    p1: "1",
    p2: "1",
    p3: "0",
    p4: "",
    desc: "Hand register 1 to the application as one result row.",
  },
  {
    id: 10,
    op: "Next",
    p1: "0",
    p2: "4",
    p3: "0",
    p4: "",
    desc: "Advance cursor 0. If there is another row, jump back to 4.",
  },
  { id: 11, op: "Close", p1: "0", p2: "0", p3: "0", p4: "", desc: "Close cursor 0." },
  { id: 12, op: "Halt", p1: "0", p2: "0", p3: "0", p4: "", desc: "Stop the program." },
];

interface TraceStep {
  /** Address executed at this step. */
  addr: number;
  /** What happened on this step, when it differs from the static description. */
  note?: string;
  /** Row the cursor is on, if open. */
  row: string;
  r1: string;
  r2: string;
  r3: string;
}

/**
 * Hand-written execution trace over a two-row table:
 * rowid 1 = 'Bob', rowid 2 = 'Alice'.
 */
const TRACE: TraceStep[] = [
  { addr: 0, row: "-", r1: "NULL", r2: "NULL", r3: "NULL" },
  { addr: 1, row: "-", r1: "NULL", r2: "NULL", r3: "NULL" },
  { addr: 2, row: "-", r1: "NULL", r2: "NULL", r3: "NULL" },
  { addr: 3, row: "rowid 1", r1: "NULL", r2: "NULL", r3: "NULL" },
  { addr: 4, row: "rowid 1", r1: "NULL", r2: "'Bob'", r3: "NULL" },
  { addr: 5, row: "rowid 1", r1: "NULL", r2: "'Bob'", r3: "'Alice'" },
  { addr: 6, row: "rowid 1", r1: "NULL", r2: "'Bob'", r3: "'Alice'", note: "Register 3 is not NULL. Fall through." },
  { addr: 7, row: "rowid 1", r1: "NULL", r2: "'Bob'", r3: "'Alice'", note: "'Bob' != 'Alice'. Jump to 10 and skip this row." },
  { addr: 10, row: "rowid 2", r1: "NULL", r2: "'Bob'", r3: "'Alice'", note: "Cursor advances to rowid 2. Jump back to 4." },
  { addr: 4, row: "rowid 2", r1: "NULL", r2: "'Alice'", r3: "'Alice'" },
  { addr: 5, row: "rowid 2", r1: "NULL", r2: "'Alice'", r3: "'Alice'" },
  { addr: 6, row: "rowid 2", r1: "NULL", r2: "'Alice'", r3: "'Alice'", note: "Register 3 is not NULL. Fall through." },
  { addr: 7, row: "rowid 2", r1: "NULL", r2: "'Alice'", r3: "'Alice'", note: "'Alice' = 'Alice'. No jump; this row matches." },
  { addr: 8, row: "rowid 2", r1: "'Alice'", r2: "'Alice'", r3: "'Alice'" },
  { addr: 9, row: "rowid 2", r1: "'Alice'", r2: "'Alice'", r3: "'Alice'", note: "Row ('Alice') goes to the application." },
  { addr: 10, row: "end", r1: "'Alice'", r2: "'Alice'", r3: "'Alice'", note: "No more rows. Fall through to 11." },
  { addr: 11, row: "closed", r1: "'Alice'", r2: "'Alice'", r3: "'Alice'" },
  { addr: 12, row: "closed", r1: "'Alice'", r2: "'Alice'", r3: "'Alice'" },
];

export default function VdbeBytecode() {
  const [pc, setPc] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const listingRef = useRef<HTMLDivElement>(null);

  const step = () => {
    if (pc < TRACE.length - 1) {
      setPc((p) => p + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const reset = () => {
    setPc(-1);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (pc >= TRACE.length - 1) reset();
    setIsPlaying(!isPlaying);
  };

  // Playback effect — use setPc updater to avoid stale closures
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPc((prev) => {
        if (prev >= TRACE.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        if (next >= TRACE.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const current = pc >= 0 ? TRACE[pc] : null;
  const activeOpIndex = current ? current.addr : -1;
  const activeOp = activeOpIndex >= 0 ? PROGRAM.find((o) => o.id === activeOpIndex) : null;

  // Keep the active instruction visible inside the listing without scrolling the page.
  useEffect(() => {
    const container = listingRef.current;
    if (!container || activeOpIndex < 0) return;
    const row = container.querySelector<HTMLElement>(`[data-addr="${activeOpIndex}"]`);
    if (!row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < container.scrollTop + 16) {
      container.scrollTop = Math.max(0, top - 16);
    } else if (bottom > container.scrollTop + container.clientHeight - 16) {
      container.scrollTop = bottom - container.clientHeight + 16;
    }
  }, [activeOpIndex]);

  const registers = [
    { label: "R1 (output)", value: current?.r1 ?? "NULL" },
    { label: "R2 (name)", value: current?.r2 ?? "NULL" },
    { label: "R3 (literal)", value: current?.r3 ?? "NULL" },
    { label: "Cursor 0", value: current?.row ?? "-" },
  ];

  return (
    <VizContainer
      title="The Virtual Database Engine (VDBE)"
      description="SQL says what you want, not how to get it. FrankenSQLite's code generator compiles each statement into a program of low-level instructions (opcodes), and the VDBE, a register-based virtual machine, runs them one at a time."
      minHeight={500}
      status="live"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-6 relative">
        {/* Top: SQL -> VM Translation */}
        <div className="flex flex-col md:flex-row gap-4 items-center mb-2">
          <div className="flex-1 w-full bg-slate-900 rounded-xl border border-white/10 p-3">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <FileCode className="w-3 h-3" /> Declarative SQL
            </div>
            <code className="text-xs font-mono text-teal-300">
              SELECT name FROM users WHERE name = &apos;Alice&apos;;
            </code>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center text-slate-500">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1">Codegen</div>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              →
            </motion.div>
          </div>

          <div className="flex-1 w-full bg-black/50 rounded-xl border border-teal-500/20 p-3">
            <div className="text-[10px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <TerminalSquare className="w-3 h-3" /> VDBE Bytecode (simplified)
            </div>
            <code className="text-xs font-mono text-teal-100/70">
              {PROGRAM.length} instructions, full table scan
            </code>
          </div>
        </div>

        {/* Center: Instruction Set & Registers */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 md:h-[340px]">
          {/* Bytecode Listing */}
          <div className="h-[260px] md:h-auto flex-[2] rounded-xl border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

            <div
              ref={listingRef}
              className="flex-1 overflow-y-auto font-mono text-[10px] py-4 relative scroll-smooth no-scrollbar"
              id="bytecode-container"
            >
              <div className="flex px-4 pb-1 text-slate-600 uppercase tracking-wider text-[9px]">
                <div className="w-7 shrink-0">addr</div>
                <div className="w-20 shrink-0">opcode</div>
                <div className="w-6 shrink-0">p1</div>
                <div className="w-6 shrink-0">p2</div>
                <div className="w-6 shrink-0">p3</div>
                <div className="min-w-0 flex-1">p4</div>
              </div>
              {PROGRAM.map((op) => {
                const isActive = op.id === activeOpIndex;
                return (
                  <motion.div
                    key={op.id}
                    data-addr={op.id}
                    layout
                    className={`flex px-4 py-1.5 transition-colors relative ${isActive ? "bg-teal-500/20 text-white" : "text-slate-500"}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="highlight"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500"
                      />
                    )}
                    <div className="w-7 shrink-0 opacity-50">{op.id}</div>
                    <div className={`w-20 shrink-0 font-bold ${isActive ? "text-teal-400" : ""}`}>
                      {op.op}
                    </div>
                    <div className="w-6 shrink-0">{op.p1}</div>
                    <div className="w-6 shrink-0">{op.p2}</div>
                    <div className="w-6 shrink-0">{op.p3}</div>
                    <div className="min-w-0 flex-1 truncate">{op.p4}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Execution State */}
          <div className="flex-1 flex flex-col gap-4">
            {/* CPU State */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 flex flex-col gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> VM State
              </div>

              <div className="flex justify-between items-center bg-black/50 rounded border border-white/5 px-3 py-2 font-mono text-xs">
                <span className="text-slate-500">Program Counter</span>
                <span className="text-white font-bold">
                  {activeOpIndex >= 0 ? activeOpIndex : "-"}
                </span>
              </div>

              <div className="bg-black/50 rounded border border-white/5 p-3 text-[10px] leading-relaxed text-teal-200/80 min-h-[60px] flex items-center">
                {current && activeOp
                  ? current.note
                    ? `${activeOp.op}: ${current.note}`
                    : activeOp.desc
                  : "Waiting for execution..."}
              </div>
            </div>

            {/* Memory Registers */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
                Registers and cursor
              </div>
              <div className="grid grid-cols-2 gap-2">
                {registers.map((reg) => (
                  <div
                    key={reg.label}
                    className="border border-white/10 bg-black/50 rounded p-2 flex flex-col gap-1 min-w-0"
                  >
                    <span className="text-[8px] font-mono text-slate-500 truncate">
                      {reg.label}
                    </span>
                    <span className="text-[10px] font-bold text-white truncate">{reg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4 z-10">
          <button
            onClick={reset}
            className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>

          <div className="flex gap-2">
            <button
              onClick={step}
              disabled={pc >= TRACE.length - 1}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs font-bold transition-all"
            >
              Step Forward
            </button>
            <button
              onClick={togglePlay}
              disabled={pc >= TRACE.length - 1}
              className="px-4 py-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500 text-xs font-black transition-all flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? "Pause" : "Auto-Play"}
            </button>
          </div>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              A step-through of the{" "}
              <FrankenJargon term="vdbe">Virtual Database Engine (VDBE)</FrankenJargon>. At the top
              left is a SQL statement. Below it is a simplified version of the bytecode
              FrankenSQLite&apos;s code generator emits for it when there is no index on{" "}
              <code>name</code>: a full table scan with a filter. P5 flags and the collation
              operand are left out, and register numbers are illustrative.
            </div>
            <p>
              On the right is the state of the virtual machine as it runs, over a two-row table
              (rowid 1 is &apos;Bob&apos;, rowid 2 is &apos;Alice&apos;): the program counter,
              where cursor 0 is, and the registers.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Step Forward</strong> to run one instruction, or{" "}
              <strong>Auto-Play</strong> to run them all.
            </p>
            <p>
              The program starts a read transaction, opens a cursor on the table (
              <code>OpenRead</code>) and loops over its rows (<code>Rewind</code>,{" "}
              <code>Next</code>). For each row it copies <code>name</code> out of the{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> into a register (
              <code>Column</code>) and compares it with &apos;Alice&apos; (<code>Ne</code>).
              &apos;Bob&apos; doesn&apos;t match, so the program jumps straight to{" "}
              <code>Next</code>. &apos;Alice&apos; matches, so it falls through to{" "}
              <code>ResultRow</code> and hands the row to the application.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              The VDBE separates understanding SQL from executing it. FrankenSQLite&apos;s
              hand-written parser builds a syntax tree, the code generator turns it into a
              register-based program, and the{" "}
              <FrankenJargon term="vdbe">VDBE</FrankenJargon> runs that program against B-tree
              cursors. Page-level work such as{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> versioning happens in the layers
              beneath those cursors.
            </div>
            <p>
              The instruction set follows SQLite&apos;s design: 190+ opcodes with SQLite&apos;s
              names and its P1 to P5 operand layout, so the listing reads like SQLite&apos;s own{" "}
              <code>EXPLAIN</code> output. Most table work compiles to bytecode this way. Some
              shapes still run through a connection-level compatibility executor instead: CTE and
              view materialization, some JOIN, GROUP BY and window-function forms, and{" "}
              <code>FOR SYSTEM_TIME</code> reads.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
