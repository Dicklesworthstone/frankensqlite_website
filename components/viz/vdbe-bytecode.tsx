"use client";

import { motion } from "framer-motion";
import { Cpu, FileCode, Pause, Play, RotateCcw, TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

interface Opcode {
  id: number;
  op: string;
  p1: string;
  p2: string;
  p3: string;
  desc: string;
}

const PROGRAM: Opcode[] = [
  { id: 0, op: "Init", p1: "0", p2: "8", p3: "0", desc: "Start execution at address 8" },
  {
    id: 1,
    op: "OpenRead",
    p1: "0",
    p2: "2",
    p3: "0",
    desc: "Open table 'users' (root page 2) using cursor 0",
  },
  {
    id: 2,
    op: "Rewind",
    p1: "0",
    p2: "7",
    p3: "0",
    desc: "Move cursor 0 to the first row. If empty, jump to 7",
  },
  {
    id: 3,
    op: "Column",
    p1: "0",
    p2: "1",
    p3: "1",
    desc: "Extract column 1 (name) from cursor 0, store in register 1",
  },
  {
    id: 4,
    op: "Eq",
    p1: "2",
    p2: "6",
    p3: "1",
    desc: "If register 1 == register 2 ('Alice'), jump to 6",
  },
  {
    id: 5,
    op: "Next",
    p1: "0",
    p2: "3",
    p3: "0",
    desc: "Move cursor 0 to next row. If successful, jump to 3",
  },
  {
    id: 6,
    op: "ResultRow",
    p1: "1",
    p2: "1",
    p3: "0",
    desc: "Yield row to application containing register 1",
  },
  { id: 7, op: "Halt", p1: "0", p2: "0", p3: "0", desc: "Terminate program" },
  { id: 8, op: "Transaction", p1: "0", p2: "0", p3: "4", desc: "Start read transaction" },
  {
    id: 9,
    op: "String8",
    p1: "0",
    p2: "2",
    p3: "Alice",
    desc: "Store string 'Alice' in register 2",
  },
  { id: 10, op: "Goto", p1: "0", p2: "1", p3: "0", desc: "Jump to main loop at address 1" },
];

export default function VdbeBytecode() {
  const [pc, setPc] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Hardcoded execution trace
  const trace = [0, 8, 9, 10, 1, 2, 3, 4, 5, 3, 4, 6, 7];

  const step = () => {
    if (pc < trace.length - 1) {
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
    if (pc >= trace.length - 1) reset();
    setIsPlaying(!isPlaying);
  };

  // Playback effect — use setPc updater to avoid stale closures
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPc((prev) => {
        if (prev >= trace.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        if (next >= trace.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying, trace.length]);

  const activeOpIndex = pc >= 0 ? trace[pc] : -1;
  const activeOp = activeOpIndex >= 0 ? PROGRAM.find((o) => o.id === activeOpIndex) : null;

  return (
    <VizContainer
      title="The Virtual Database Engine (VDBE)"
      description="SQL is declarative: you describe what you want, not how to get it. The Query Planner compiles your SQL into a program of low-level instructions (opcodes). The VDBE is a custom virtual machine that executes these instructions one by one."
      minHeight={500}
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
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1">Compiler</div>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              →
            </motion.div>
          </div>

          <div className="flex-1 w-full bg-black/50 rounded-xl border border-teal-500/20 p-3">
            <div className="text-[10px] font-black text-teal-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <TerminalSquare className="w-3 h-3" /> Imperative Bytecode
            </div>
            <code className="text-xs font-mono text-teal-100/70">11 Instructions Compiled</code>
          </div>
        </div>

        {/* Center: Instruction Set & Registers */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 h-[250px] overflow-hidden">
          {/* Bytecode Listing */}
          <div className="flex-[2] rounded-xl border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

            <div
              className="flex-1 overflow-y-auto font-mono text-[10px] py-4 relative scroll-smooth no-scrollbar"
              id="bytecode-container"
            >
              {PROGRAM.map((op) => {
                const isActive = op.id === activeOpIndex;
                return (
                  <motion.div
                    key={op.id}
                    layout
                    className={`flex px-4 py-1.5 transition-colors relative ${isActive ? "bg-teal-500/20 text-white" : "text-slate-500"}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="highlight"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500"
                      />
                    )}
                    <div className="w-8 opacity-50">{op.id}</div>
                    <div className={`w-24 font-bold ${isActive ? "text-teal-400" : ""}`}>
                      {op.op}
                    </div>
                    <div className="w-8">{op.p1}</div>
                    <div className="w-8">{op.p2}</div>
                    <div className="w-16">{op.p3}</div>
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
                {activeOp ? activeOp.desc : "Waiting for execution..."}
              </div>
            </div>

            {/* Memory Registers */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
                Registers
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-white/10 bg-black/50 rounded p-2 flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-slate-500">R1 (Column)</span>
                  <span className="text-[10px] font-bold text-white truncate">
                    {pc >= 6 ? "Bob" : pc >= 3 ? "Alice" : "NULL"}
                  </span>
                </div>
                <div className="border border-white/10 bg-black/50 rounded p-2 flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-slate-500">R2 (Target)</span>
                  <span className="text-[10px] font-bold text-white truncate">
                    {pc >= 2 ? "'Alice'" : "NULL"}
                  </span>
                </div>
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
              disabled={pc >= trace.length - 1}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs font-bold transition-all"
            >
              Step Forward
            </button>
            <button
              onClick={togglePlay}
              disabled={pc >= trace.length - 1}
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
              You are looking at the inner workings of the{" "}
              <FrankenJargon term="vdbe">Virtual Database Engine (VDBE)</FrankenJargon>. At the top
              left is a standard SQL statement. Below that is the actual imperative Bytecode program
              that the engine compiled the SQL into.
            </div>
            <p>
              On the right is the state of the Virtual Machine as it executes the bytecode, showing
              the Program Counter and internal memory registers.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click <strong>Step Forward</strong> to advance the execution by a single instruction.
            </p>
            <p>
              Watch as the virtual machine initializes, opens the table (<code>OpenRead</code>), and
              loops over the rows (<code>Rewind</code>, <code>Next</code>). Notice how it pulls data
              from the B-tree into Register 1 (<code>Column</code>), compares it against our target
              &apos;Alice&apos; in Register 2 (<code>Eq</code>), and eventually yields a result to
              the user (<code>ResultRow</code>).
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              SQL tells a database <i>what</i> data you want, not <i>how</i> to get it. By compiling
              SQL into a set of optimized, low-level opcodes, the{" "}
              <FrankenJargon term="vdbe">VDBE</FrankenJargon> acts as an abstraction layer between
              the query parser and the underlying storage engine.
            </div>
            <div>
              This allows FrankenSQLite to have a sophisticated storage layer (
              <FrankenJargon term="mvcc">MVCC</FrankenJargon>,{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> with{" "}
              <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>,{" "}
              <FrankenJargon term="database-cracking">Database Cracking</FrankenJargon>) while
              remaining 100% compatible with the standard{" "}
              <FrankenJargon term="sql-dialect">SQLite dialect</FrankenJargon>.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
