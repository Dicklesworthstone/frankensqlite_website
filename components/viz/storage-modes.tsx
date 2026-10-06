"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Database, Layers, Shield, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

const STEPS: Step[] = [
  {
    label: "File layout",
    description:
      "Compatibility mode, the runtime today, uses a standard SQLite database file plus a rollback journal or WAL. The native-mode design keeps an append-only stream of commit objects stored as RaptorQ symbols.",
  },
  {
    label: "INSERT",
    description:
      "Compatibility: the changed B-tree page goes through the journal or WAL and ends up written in place in the .db file. Native design: the commit becomes a new immutable CommitCapsule, made durable by a CommitMarker.",
  },
  {
    label: "UPDATE",
    description:
      "Compatibility: the page is rewritten, and after a checkpoint the file holds only the current version. Native design: earlier capsules stay in the stream until compaction reclaims them.",
  },
  {
    label: "Corruption",
    description:
      "Compatibility: WAL frame checksums detect damage, but nothing repairs it automatically. Native design: each symbol carries an XXH3 check, and RaptorQ repair symbols would rebuild the damaged object.",
  },
  {
    label: "Time-travel query",
    description:
      "Compatibility: FOR SYSTEM_TIME AS OF works on :memory: databases only, from up to 256 snapshots taken at COMMIT. File-backed databases return an explicit error. Native design: history would come from the commit stream.",
  },
  {
    label: "Where things stand",
    description:
      "Compatibility mode is the default and the only mode you can use today. Native mode is design plus partial implementation, with no stable switch.",
  },
];

/* ------------------------------------------------------------------ */
/*  Step visual data                                                   */
/* ------------------------------------------------------------------ */

interface PanelVis {
  blocks: { label: string; color: string; status?: "ok" | "error" | "repair" | "dim" }[];
  annotation?: string;
  badge?: { text: string; color: string };
}

function getCompatVis(step: number): PanelVis {
  switch (step) {
    case 0:
      return {
        blocks: [
          { label: "Header", color: "#64748b" },
          { label: "Page 1", color: "#475569" },
          { label: "Page 2", color: "#475569" },
          { label: "Page 3", color: "#475569" },
          { label: "Free", color: "#1e293b" },
        ],
        annotation: "Standard SQLite .db file (plus -wal or -journal)",
      };
    case 1:
      return {
        blocks: [
          { label: "Header", color: "#64748b" },
          { label: "Page 1", color: "#475569" },
          { label: "Page 2", color: "#38bdf8", status: "ok" },
          { label: "Page 3", color: "#475569" },
          { label: "Free", color: "#1e293b" },
        ],
        annotation: "INSERT → Page 2 changes (via WAL or journal)",
      };
    case 2:
      return {
        blocks: [
          { label: "Header", color: "#64748b" },
          { label: "Page 1", color: "#475569" },
          { label: "Page 2", color: "#f59e0b", status: "ok" },
          { label: "Page 3", color: "#475569" },
          { label: "Free", color: "#1e293b" },
        ],
        annotation: "UPDATE → Page 2 rewritten; only the current version stays in the file",
      };
    case 3:
      return {
        blocks: [
          { label: "Header", color: "#64748b" },
          { label: "Page 1", color: "#475569" },
          { label: "Page 2", color: "#ef4444", status: "error" },
          { label: "Page 3", color: "#475569" },
          { label: "Free", color: "#1e293b" },
        ],
        annotation:
          "Corruption → WAL checksums or PRAGMA integrity_check may catch it; no automatic repair",
      };
    case 4:
      return {
        blocks: [
          { label: "Header", color: "#64748b" },
          { label: "Page 1", color: "#475569", status: "dim" },
          { label: "Page 2", color: "#475569", status: "dim" },
          { label: "Page 3", color: "#475569", status: "dim" },
          { label: "Free", color: "#1e293b" },
        ],
        annotation:
          "Time travel: :memory: databases only (ring of up to 256 snapshots); file-backed queries return an error",
        badge: {
          text: ":MEMORY: ONLY",
          color: "text-amber-400 border-amber-500/30 bg-amber-500/5",
        },
      };
    case 5:
      return {
        blocks: [
          { label: "Header", color: "#64748b" },
          { label: "Page 1", color: "#475569" },
          { label: "Page 2", color: "#475569" },
          { label: "Page 3", color: "#475569" },
          { label: "Free", color: "#1e293b" },
        ],
        annotation: "Live default: standard files that stock sqlite3 can read",
      };
    default:
      return { blocks: [] };
  }
}

function getEcsVis(step: number): PanelVis {
  switch (step) {
    case 0:
      return {
        blocks: [
          { label: "Capsule 1", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 2", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "→", color: "#115e59" },
        ],
        annotation: "Design: append-only commit capsules stored as RaptorQ symbols",
      };
    case 1:
      return {
        blocks: [
          { label: "Capsule 1", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 2", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 3 (new)", color: "#38bdf8", status: "ok" },
        ],
        annotation: "INSERT → new immutable capsule appended, then a CommitMarker",
      };
    case 2:
      return {
        blocks: [
          { label: "Capsule 2", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 3", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 4 (new)", color: "#f59e0b", status: "ok" },
        ],
        annotation: "UPDATE → earlier capsules kept, new one appended",
      };
    case 3:
      return {
        blocks: [
          { label: "Capsule 2", color: "#ef4444", status: "error" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 3", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Rebuilt", color: "#22c55e", status: "repair" },
        ],
        annotation: "Corruption → design: repair symbols rebuild the damaged object",
      };
    case 4:
      return {
        blocks: [
          { label: "Commit 2", color: "#14b8a6", status: "ok" },
          { label: "Commit 3", color: "#14b8a6", status: "ok" },
          { label: "Commit 4", color: "#38bdf8", status: "ok" },
          { label: "Repair", color: "#0d9488" },
          { label: "→", color: "#115e59" },
        ],
        annotation: "Time travel → design: read an earlier commit from the stream",
        badge: {
          text: "DESIGN",
          color: "text-slate-300 border-slate-400/30 bg-slate-400/5",
        },
      };
    case 5:
      return {
        blocks: [
          { label: "Capsule 1", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "Capsule 2", color: "#14b8a6" },
          { label: "Repair", color: "#0d9488" },
          { label: "→", color: "#115e59" },
        ],
        annotation: "Design plus partial implementation; no stable switch to turn it on",
      };
    default:
      return { blocks: [] };
  }
}

/* ------------------------------------------------------------------ */
/*  Panel component                                                    */
/* ------------------------------------------------------------------ */

function ModePanel({
  title,
  icon,
  color,
  vis,
  step,
  prefersReducedMotion,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  vis: PanelVis;
  step: number;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
        >
          {icon}
        </div>
        <span className="text-sm font-black text-white">{title}</span>
      </div>

      {/* Blocks */}
      <div className="space-y-1.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="space-y-1.5"
          >
            {vis.blocks.map((block, i) => {
              const borderColor =
                block.status === "error"
                  ? "#ef4444"
                  : block.status === "repair"
                    ? "#22c55e"
                    : block.status === "ok"
                      ? block.color
                      : "rgba(255,255,255,0.06)";

              return (
                <motion.div
                  key={`${step}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{
                    opacity: block.status === "dim" ? 0.3 : 1,
                    x: 0,
                  }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.3,
                    delay: prefersReducedMotion ? 0 : i * 0.06,
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
                  style={{
                    borderColor,
                    backgroundColor: `${block.color}10`,
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: block.color }}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">{block.label}</span>
                  {block.status === "error" && <X className="h-3.5 w-3.5 text-red-400 ml-auto" />}
                  {block.status === "repair" && (
                    <Shield className="h-3.5 w-3.5 text-emerald-400 ml-auto" />
                  )}
                  {block.status === "ok" && (
                    <Check className="h-3.5 w-3.5 ml-auto" style={{ color: block.color }} />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Badge */}
      {vis.badge && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${vis.badge.color}`}
        >
          {vis.badge.text}
        </motion.div>
      )}

      {/* Annotation */}
      {vis.annotation && (
        <p className="text-[11px] text-slate-400 leading-relaxed">{vis.annotation}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trade-off cards (step 5)                                           */
/* ------------------------------------------------------------------ */

function TradeoffCards({
  step,
  prefersReducedMotion,
}: {
  step: number;
  prefersReducedMotion: boolean | null;
}) {
  if (step !== 5) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"
    >
      <div className="rounded-lg border border-slate-500/20 bg-slate-500/5 p-4">
        <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-slate-400" />
          Compatibility Mode (live today)
        </h4>
        <ul className="space-y-1.5 text-[11px] text-slate-400">
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Opens standard SQLite
            files (UTF-8 and UTF-16)
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Stock sqlite3 can read the
            files it writes
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> The default runtime
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-amber-400 flex-shrink-0" /> Time travel on :memory:
            only
          </li>
          <li className="flex items-center gap-2">
            <X className="h-3 w-3 text-red-400 flex-shrink-0" /> No automatic corruption repair
          </li>
        </ul>
      </div>
      <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
        <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-teal-400" />
          Native ECS Mode (design)
        </h4>
        <ul className="space-y-1.5 text-[11px] text-slate-400">
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" /> Commit stream as the source
            of truth
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" /> RaptorQ repair symbols for
            every object
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" /> Content-addressed objects
            (BLAKE3 ObjectIds)
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" /> History for file-backed
            databases
          </li>
          <li className="flex items-center gap-2">
            <X className="h-3 w-3 text-red-400 flex-shrink-0" /> No stable switch to enable it yet
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function StorageModes() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const onStepChange = useCallback((s: number) => setStep(s), []);

  const compatVis = useMemo(() => getCompatVis(step), [step]);
  const ecsVis = useMemo(() => getEcsVis(step), [step]);

  return (
    <VizContainer
      title="Storage Mode Comparator"
      status="design"
      description="Compatibility mode is what runs today: standard SQLite files with a rollback journal or WAL. Native ECS mode, shown on the right, is a design with partial implementation and no stable switch. The badge refers to native mode."
      minHeight={440}
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Side-by-side panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModePanel
            title="Compatibility (.db), live"
            icon={<Database className="h-4 w-4 text-slate-400" />}
            color="#64748b"
            vis={compatVis}
            step={step}
            prefersReducedMotion={prefersReducedMotion}
          />
          <ModePanel
            title="Native ECS, design"
            icon={<Layers className="h-4 w-4 text-teal-400" />}
            color="#14b8a6"
            vis={ecsVis}
            step={step}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>

        {/* Trade-off cards on final step */}
        <TradeoffCards step={step} prefersReducedMotion={prefersReducedMotion} />

        {/* Stepper */}
        <Stepper
          steps={STEPS}
          currentStep={step}
          onStepChange={onStepChange}
          autoPlayInterval={3500}
        />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              Two storage modes side by side. <strong>Compatibility mode</strong> (left) is the
              runtime you get today. It reads and writes standard SQLite database files with a
              rollback journal or WAL, and stock SQLite can open the files it writes.
            </p>
            <p>
              <strong>
                Native <FrankenJargon term="ecs">ECS</FrankenJargon> mode
              </strong>{" "}
              (right) is a design with partial implementation. Its durable state would be an
              append-only <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon> of commit
              objects protected by <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> repair
              symbols. Pieces exist in the code, but <code>PRAGMA fsqlite.mode</code> is not a
              stable switch.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Step through the 6 stages to follow the same operations through each mode. On the
              left, pages are updated in place through the journal or WAL. On the right, the design
              appends new commit objects and their{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> instead of
              overwriting anything.
            </p>
            <p>
              At the time-travel stage, note that compatibility mode does support{" "}
              <FrankenJargon term="time-travel">time-travel queries</FrankenJargon>, but only on{" "}
              <code>:memory:</code> databases.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Compatibility mode is why you can try FrankenSQLite on existing SQLite databases
              (UTF-8 or UTF-16) without converting them, and why stock tools can still read the
              result.
            </p>
            <p>
              The native design aims at things a mutable file cannot easily give you: built-in
              repair data, <FrankenJargon term="content-addressed">content-addressed</FrankenJargon>{" "}
              objects, and history for file-backed databases. Those are goals, not features you
              can turn on today, and their disk and latency costs have not been measured on a
              shipped implementation.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
