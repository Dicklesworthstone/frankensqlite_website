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
  { name: "Parse", crates: ["fsqlite-parser", "fsqlite-ast"], color: "#38bdf8" },
  { name: "Compile", crates: ["fsqlite-core", "fsqlite-vdbe::codegen"], color: "#a78bfa" },
  { name: "Execute", crates: ["fsqlite-vdbe::engine"], color: "#f472b6" },
  {
    name: "B-tree + Pager + MVCC",
    crates: ["fsqlite-btree", "fsqlite-pager", "fsqlite-mvcc"],
    color: "#fb923c",
  },
  { name: "WAL + VFS", crates: ["fsqlite-wal", "fsqlite-vfs"], color: "#34d399" },
  { name: "Result Row", crates: ["fsqlite-core", "fsqlite"], color: "#14b8a6" },
];

interface StepData {
  /** Index into LAYERS that is active (-1 for input step) */
  activeLayer: number;
  input: { label: string; content: string };
  output: { label: string; content: string };
  highlight?: string;
}

const AST_TEXT =
  "SelectStatement\n  \u251c\u2500 columns: *\n  \u251c\u2500 from: users\n  \u2514\u2500 where: id = 42";

/**
 * Simplified version of what fsqlite-vdbe's codegen emits for a rowid
 * equality lookup (`codegen_select_rowid_lookup`). Register numbers are
 * illustrative.
 */
const BYTECODE_TEXT = [
  "0  Init",
  "1  Transaction  read",
  "2  Integer      42 \u2192 r4",
  "3  OpenRead     c0, users",
  "4  SeekRowid    c0, r4  miss \u2192 9",
  "5  Rowid        c0 \u2192 r1",
  "6  Column       c0, 1 \u2192 r2",
  "7  Column       c0, 2 \u2192 r3",
  "8  ResultRow    r1..r3",
  "9  Close        c0",
  "10 Halt",
].join("\n");

const STEP_DATA: StepData[] = [
  {
    activeLayer: -1,
    input: { label: "SQL Query", content: "SELECT * FROM users WHERE id = 42" },
    output: { label: "Call", content: "conn.query(sql) on an fsqlite::Connection" },
  },
  {
    activeLayer: 0,
    input: { label: "Raw SQL", content: "SELECT * FROM users WHERE id = 42" },
    output: { label: "AST", content: AST_TEXT },
  },
  {
    activeLayer: 1,
    input: { label: "AST", content: AST_TEXT },
    output: { label: "Bytecode (simplified)", content: BYTECODE_TEXT },
    highlight:
      "id is the rowid, so codegen emits SeekRowid, not an index seek. fsqlite-planner can hint the access path for simple single-table SELECTs, but codegen decides.",
  },
  {
    activeLayer: 2,
    input: {
      label: "Bytecode",
      content: "Integer   42 \u2192 r4\nSeekRowid c0, r4",
    },
    output: {
      label: "Cursor Call",
      content: "c0.table_move_to(42)\nfound   \u2192 continue at Rowid\nmissing \u2192 jump to Close, Halt",
    },
    highlight: "Interpreted by VdbeEngine. The pattern JIT is off by default.",
  },
  {
    activeLayer: 3,
    input: {
      label: "Cursor Seek",
      content: "rowid 42 in the users table B-tree",
    },
    output: {
      label: "Page Path",
      content: "root p.2 \u2192 interior p.17 \u2192 leaf p.1204\ncell for rowid 42 at offset 0x2F0",
    },
    highlight: "MVCC visibility: a page version is visible if commit_seq \u2264 snapshot.high",
  },
  {
    activeLayer: 4,
    input: {
      label: "Page Request",
      content: "page 1204 (page-cache miss)",
    },
    output: {
      label: "Page Source",
      content: "WAL page index lookup\n  hit  \u2192 frame from app.db-wal\n  miss \u2192 page from app.db",
    },
    highlight:
      "WAL frames carry SQLite's checksum chain, checked when frames are indexed, not on every read. RaptorQ is not on the read path.",
  },
  {
    activeLayer: 5,
    input: {
      label: "Leaf Cell",
      content: "rowid: 42\nrecord: NULL, 'Alice', 'alice@example.com'",
    },
    output: {
      label: "Row",
      content: 'Row [\n  Integer(42),\n  Text("Alice"),\n  Text("alice@example.com") ]',
    },
    highlight:
      "SQLite's record format: the rowid-alias column is stored as NULL and Rowid supplies 42.",
  },
];

const STEPS: Step[] = [
  {
    label: "Query Input",
    description:
      "The app calls conn.query() on an fsqlite::Connection. In this example, users declares id INTEGER PRIMARY KEY, so id is the table's rowid.",
  },
  {
    label: "Parse",
    description:
      "fsqlite-parser's hand-written parser turns the SQL text into a typed SelectStatement from fsqlite-ast.",
  },
  {
    label: "Compile",
    description:
      "fsqlite-core hands the statement to fsqlite-vdbe's codegen, which picks the access path and emits bytecode. Some CTE, view, join and window shapes still run through a compatibility executor instead.",
  },
  {
    label: "Execute",
    description:
      "The register-based VM runs the program. SeekRowid moves the table cursor to rowid 42. If no row has that rowid, it jumps to Close and Halt and the query returns no rows.",
  },
  {
    label: "B-tree + Pager + MVCC",
    description:
      "fsqlite-btree descends from the root page to the leaf that holds rowid 42. fsqlite-pager supplies each page, and fsqlite-mvcc picks the newest version committed at or before this read's snapshot.",
  },
  {
    label: "WAL + VFS",
    description:
      "On a page-cache miss, the pager looks for the newest visible WAL frame of that page. If there is one, fsqlite-wal reads it from the -wal file. Otherwise the page comes from the main database file. Both reads go through fsqlite-vfs.",
  },
  {
    label: "Result Row",
    description:
      "Rowid and Column decode the leaf cell into registers and ResultRow emits them. fsqlite-core collects them into a Row of SqliteValue values, which the fsqlite facade returns.",
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
      <pre className="text-[11px] font-mono text-slate-500 leading-relaxed whitespace-pre-wrap break-words mb-1">
        {"-- users(id INTEGER PRIMARY KEY, name TEXT, email TEXT)"}
      </pre>
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
      description="Follow one point lookup through the live engine, from SQL text to the returned row."
      minHeight={480}
      status="live"
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

        <p className="text-[10px] font-mono text-slate-600">
          Page numbers, offsets and register numbers are illustrative.
        </p>

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
              One read query, <code>SELECT * FROM users WHERE id = 42</code>, followed from SQL
              text down to page reads and back up to a returned row. The table declares{" "}
              <code>id INTEGER PRIMARY KEY</code>, so <code>id</code> is the rowid.
            </p>
            <p>
              Each band is one stage of the live engine, labeled with the crates that do the work.
              The workspace has 28 crates (26 published). The bands show the ten main crates on
              this query&apos;s path.
            </p>
          </>
        }
        howToUse={
          <>
            <p>Press play, or step through the six stages.</p>
            <div>
              At Compile, look at the bytecode. Because <code>id</code> is the rowid, the{" "}
              <FrankenJargon term="vdbe">VDBE</FrankenJargon> program uses <code>SeekRowid</code>{" "}
              instead of an index seek. A miss jumps straight to <code>Close</code> and{" "}
              <code>Halt</code>, so a missing id returns zero rows.
            </div>
            <div>
              In the storage stages, the <FrankenJargon term="btree">B-tree</FrankenJargon> asks
              the pager for pages. <FrankenJargon term="mvcc">MVCC</FrankenJargon> picks the
              version this read&apos;s snapshot may see. On a cache miss, the{" "}
              <FrankenJargon term="wal">WAL</FrankenJargon> is checked for a newer frame before the
              main file is read.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              C SQLite has the same layers inside one C library: parser, code generator, VDBE,
              B-tree, pager and OS layer. FrankenSQLite keeps that layering and splits it into Rust
              crates. It also keeps SQLite&apos;s file format, so stock sqlite3 can open the
              databases it writes.
            </p>
            <p>
              The pipeline also shows what is unfinished. The separate fsqlite-planner crate is
              substantial but is not yet the main compile path, and some CTE, view, join and window
              queries still run through a compatibility executor instead of VDBE codegen.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
