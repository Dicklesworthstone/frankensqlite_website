"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Layer & step definitions                                           */
/* ------------------------------------------------------------------ */

interface LayerDef {
  name: string;
  crates: string[];
  color: string;
}

const LAYERS: LayerDef[] = [
  { name: "Parser", crates: ["fsqlite-parser", "fsqlite-ast"], color: "#38bdf8" },
  { name: "Planner", crates: ["fsqlite-planner"], color: "#a78bfa" },
  { name: "VDBE Compiler", crates: ["fsqlite-vdbe"], color: "#f472b6" },
  {
    name: "B-tree + MVCC",
    crates: ["fsqlite-btree", "fsqlite-pager", "fsqlite-mvcc"],
    color: "#fb923c",
  },
  { name: "Storage", crates: ["fsqlite-wal", "fsqlite-vfs"], color: "#34d399" },
  { name: "Result", crates: ["fsqlite", "fsqlite-core"], color: "#14b8a6" },
];

interface StepData {
  /** Index into LAYERS that is active (-1 for input step) */
  activeLayer: number;
  input: { label: string; content: string };
  output: { label: string; content: string };
  highlight?: string;
}

const STEP_DATA: StepData[] = [
  {
    activeLayer: -1,
    input: { label: "SQL Query", content: "SELECT * FROM users WHERE id = 42" },
    output: { label: "Ready", content: "Query submitted to FrankenSQLite engine" },
  },
  {
    activeLayer: 0,
    input: { label: "Raw SQL", content: "SELECT * FROM users WHERE id = 42" },
    output: {
      label: "AST",
      content: "SELECT\n  \u251c\u2500 FROM \u2192 users\n  \u2514\u2500 WHERE \u2192 id = 42",
    },
  },
  {
    activeLayer: 1,
    input: {
      label: "AST",
      content: "SELECT\n  \u251c\u2500 FROM \u2192 users\n  \u2514\u2500 WHERE \u2192 id = 42",
    },
    output: {
      label: "Query Plan",
      content: "Index Seek on users.id = 42\ncost: 3  rows: 1",
    },
  },
  {
    activeLayer: 2,
    input: {
      label: "Plan",
      content: "Index Seek on users.id = 42",
    },
    output: {
      label: "Bytecode",
      content: "OpenRead  0\nSeekEq    0, 42\nColumn    0, 1\nResultRow",
    },
  },
  {
    activeLayer: 3,
    input: {
      label: "Bytecode",
      content: "SeekEq 0, 42",
    },
    output: {
      label: "Page Read",
      content: "root \u2192 internal \u2192 leaf\npage #1204 offset 0x2F0",
    },
    highlight: "MVCC visibility check: commit_seq \u2264 snapshot.high",
  },
  {
    activeLayer: 4,
    input: {
      label: "Page Req",
      content: "Read page #1204",
    },
    output: {
      label: "Raw Bytes",
      content: "WAL check \u2192 disk read\nchecksum: 0xA3F1..9C2E",
    },
    highlight: "RaptorQ integrity verified",
  },
  {
    activeLayer: 5,
    input: {
      label: "Bytes",
      content: "0x00 0x2A 0x05 Alice ...",
    },
    output: {
      label: "Result Row",
      content: "{ id: 42,\n  name: 'Alice',\n  email: 'alice@example.com' }",
    },
  },
];

const STEPS: Step[] = [
  {
    label: "Query Input",
    description: "A SQL query is submitted to the FrankenSQLite engine for execution.",
  },
  {
    label: "Parser Layer",
    description:
      "The raw SQL string is tokenized and parsed into an Abstract Syntax Tree by fsqlite-parser and fsqlite-ast.",
  },
  {
    label: "Planner Layer",
    description:
      "fsqlite-planner analyzes the AST, selects indexes, and produces an optimized query plan.",
  },
  {
    label: "VDBE Compiler",
    description: "The query plan is compiled into VDBE bytecode opcodes by fsqlite-vdbe.",
  },
  {
    label: "B-tree + MVCC",
    description:
      "fsqlite-btree traverses the B-tree using the bytecode. fsqlite-mvcc ensures snapshot isolation.",
  },
  {
    label: "Storage",
    description:
      "fsqlite-wal checks the write-ahead log, fsqlite-vfs reads from disk. RaptorQ verifies integrity.",
  },
  {
    label: "Result",
    description:
      "fsqlite-core assembles raw bytes into the final result row returned to the caller.",
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Small crate name pill */
function CratePill({ name, active }: { name: string; active: boolean }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide transition-all duration-300 ${
        active
          ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
          : "bg-white/5 text-slate-600 border border-white/5"
      }`}
    >
      {name}
    </span>
  );
}

/** Code block panel for input / output */
function DataPanel({
  label,
  content,
  side,
}: {
  label: string;
  content: string;
  side: "input" | "output";
}) {
  const borderColor = side === "input" ? "border-slate-600/40" : "border-teal-500/40";
  const labelColor = side === "input" ? "text-slate-500" : "text-teal-500";

  return (
    <div className={`rounded-lg border ${borderColor} bg-black/60 p-2 md:p-3 flex-1 min-w-0`}>
      <div className={`text-[9px] font-black uppercase tracking-[0.2em] ${labelColor} mb-1.5`}>
        {label}
      </div>
      <pre className="text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}

/** A single layer band in the pipeline stack */
function LayerBand({
  layer,
  index,
  isActive,
  stepData,
}: {
  layer: LayerDef;
  index: number;
  isActive: boolean;
  stepData: StepData | null;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      layout={!prefersReducedMotion}
      className={`relative rounded-lg border transition-colors duration-300 overflow-hidden ${
        isActive ? "border-teal-500/50 bg-black/50" : "border-white/5 bg-black/20"
      }`}
      animate={{
        paddingTop: isActive ? 12 : 6,
        paddingBottom: isActive ? 12 : 6,
        paddingLeft: 12,
        paddingRight: 12,
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Animated packet indicator */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500"
          initial={{ opacity: prefersReducedMotion ? 0.7 : 0 }}
          animate={prefersReducedMotion ? { opacity: 0.7 } : { opacity: [0.3, 1, 0.3] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }
        />
      )}

      {/* Layer header row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Layer number badge */}
        <div
          className={`flex items-center justify-center h-5 w-5 rounded text-[9px] font-black shrink-0 transition-colors duration-300 ${
            isActive ? "bg-teal-500/20 text-teal-400" : "bg-white/5 text-slate-600"
          }`}
        >
          {index + 1}
        </div>

        {/* Layer name */}
        <span
          className={`text-xs font-black uppercase tracking-[0.15em] transition-colors duration-300 ${
            isActive ? "text-white" : "text-slate-500"
          }`}
        >
          {layer.name}
        </span>

        {/* Crate pills */}
        <div className="flex flex-wrap gap-1">
          {layer.crates.map((c) => (
            <CratePill key={c} name={c} active={isActive} />
          ))}
        </div>

        {/* Packet dot (animated across when active) */}
        {isActive && (
          <motion.div
            className="h-2 w-2 rounded-full bg-teal-500 shrink-0 ml-auto"
            animate={
              prefersReducedMotion
                ? { opacity: 0.7 }
                : { opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            }
          />
        )}
      </div>

      {/* Expanded content: input -> output */}
      <AnimatePresence>
        {isActive && stepData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch">
              <DataPanel
                label={stepData.input.label}
                content={stepData.input.content}
                side="input"
              />
              {/* Arrow */}
              <div className="flex items-center justify-center shrink-0 py-1 sm:py-0">
                <svg
                  className="h-4 w-6 text-teal-500/60 rotate-90 sm:rotate-0"
                  viewBox="0 0 24 16"
                  fill="none"
                >
                  <path
                    d="M2 8h18m0 0l-5-5m5 5l-5 5"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <DataPanel
                label={stepData.output.label}
                content={stepData.output.content}
                side="output"
              />
            </div>

            {/* Highlight callout */}
            {stepData.highlight && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                className="mt-2 flex items-start gap-2 px-3 py-2 rounded-md border border-teal-500/20 bg-teal-500/5"
              >
                <span className="text-teal-500 text-xs shrink-0 mt-px">{"\u2192"}</span>
                <span className="text-xs text-teal-300 font-mono">{stepData.highlight}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Input display for step 0                                           */
/* ------------------------------------------------------------------ */

function QueryInputBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="mb-4 rounded-xl border border-teal-500/30 bg-black/60 p-4"
    >
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500 mb-2">
        SQL Query
      </div>
      <pre className="text-sm md:text-base font-mono text-teal-300 leading-relaxed">
        <span className="text-slate-500">{">"}</span> <span className="text-sky-400">SELECT</span>{" "}
        <span className="text-slate-300">*</span> <span className="text-sky-400">FROM</span>{" "}
        <span className="text-amber-300">users</span> <span className="text-sky-400">WHERE</span>{" "}
        <span className="text-amber-300">id</span> <span className="text-slate-300">=</span>{" "}
        <span className="text-emerald-400">42</span>
      </pre>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function QueryPipeline() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const stepData = useMemo(() => STEP_DATA[currentStep], [currentStep]);

  return (
    <VizContainer
      title="Query Pipeline Flythrough"
      description="Watch a SQL query flow through FrankenSQLite's 6 architectural layers and 26-crate pipeline, from raw SQL to result row."
      minHeight={480}
    >
      <div className="p-3 md:p-6 flex flex-col gap-4">
        {/* Query input banner (visible on step 0) */}
        <AnimatePresence>{currentStep === 0 && <QueryInputBlock />}</AnimatePresence>

        {/* Compact query reminder when past step 0 */}
        <AnimatePresence>
          {currentStep > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="text-[10px] font-mono text-slate-600 mb-1 truncate">
                <span className="text-slate-700">{">"}</span> SELECT * FROM users WHERE id = 42
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer stack */}
        <div className="flex flex-col gap-1.5">
          {LAYERS.map((layer, i) => (
            <LayerBand
              key={layer.name}
              layer={layer}
              index={i}
              isActive={stepData.activeLayer === i}
              stepData={stepData.activeLayer === i ? stepData : null}
            />
          ))}
        </div>

        {/* Stepper controls */}
        <div className="mt-2">
          <Stepper
            steps={STEPS}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            autoPlayInterval={3000}
          />
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are watching the exact execution pipeline of a single SQL query as it flows from
              raw text down to physical disk bytes and back up again.
            </p>
            <p>
              FrankenSQLite is not a monolith. It is composed of 26 independent Rust crates
              organized into strictly defined architectural layers.
            </p>
          </>
        }
        howToUse={
          <>
            <p>Follow the animation through the 6 stages.</p>
            <p>
              First, the raw text is parsed into an Abstract Syntax Tree (AST). The Query Planner
              analyzes this AST and compiles it into an imperative Bytecode program.
            </p>
            <div>
              The <FrankenJargon term="vdbe">VDBE</FrankenJargon> virtual machine executes this
              bytecode, calling into the <FrankenJargon term="btree">B-Tree</FrankenJargon> storage
              layer. The B-Tree requests pages from the Pager, which finally translates those into
              raw 4KB byte arrays fetched from the VFS (Virtual File System).
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              Legacy C SQLite is notoriously monolithic, making it incredibly difficult to modify or
              test specific components in isolation.
            </p>
            <div>
              Because FrankenSQLite uses a strict workspace of 26 decoupled crates, it is inherently
              composable. You can swap out the VFS to write to S3, or you can drop the SQL parser
              entirely and use the <FrankenJargon term="mvcc">MVCC</FrankenJargon> B-Tree directly
              as a high-performance embedded key-value store.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
