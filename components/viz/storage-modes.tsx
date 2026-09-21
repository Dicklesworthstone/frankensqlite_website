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
      "Compatibility mode uses a standard B-tree file. Native ECS mode uses an append-only segment chain with inline parity blocks.",
  },
  {
    label: "INSERT",
    description:
      "Compatibility: cell inserted in-place in the B-tree page. ECS: new immutable page version appended to the segment chain.",
  },
  {
    label: "UPDATE",
    description:
      "Compatibility: cell overwritten in the existing page. ECS: old version kept, new version appended. History preserved.",
  },
  {
    label: "Corruption",
    description:
      "Compatibility: damaged page has no recovery path. ECS: RaptorQ parity detects and repairs corruption automatically.",
  },
  {
    label: "Time-travel query",
    description:
      "Compatibility: not supported, only the current state exists. ECS: historical versions retrieved directly from the append-only chain.",
  },
  {
    label: "Trade-offs",
    description: "Choose based on your needs: maximum compatibility or maximum durability.",
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
        annotation: "Standard .sqlite3 B-tree file",
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
        annotation: "INSERT → cell added to Page 2 in-place",
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
        annotation: "UPDATE → cell overwritten, old value lost",
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
        annotation: "Corruption → no recovery path",
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
        annotation: "Time-travel: not supported",
        badge: { text: "NOT AVAILABLE", color: "text-red-400 border-red-500/30 bg-red-500/5" },
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
        annotation: "Max compatibility, standard tooling, smaller files",
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
          { label: "Seg 1", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "Seg 2", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "→", color: "#115e59" },
        ],
        annotation: "Append-only segment chain + RaptorQ parity",
      };
    case 1:
      return {
        blocks: [
          { label: "Seg 1", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "Seg 2", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "v2 (new)", color: "#38bdf8", status: "ok" },
        ],
        annotation: "INSERT → new immutable version appended",
      };
    case 2:
      return {
        blocks: [
          { label: "v1 (old)", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "v2", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "v3 (new)", color: "#f59e0b", status: "ok" },
        ],
        annotation: "UPDATE → old version kept, new appended",
      };
    case 3:
      return {
        blocks: [
          { label: "Seg 1", color: "#ef4444", status: "error" },
          { label: "Parity", color: "#0d9488" },
          { label: "Seg 2", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "Repaired", color: "#22c55e", status: "repair" },
        ],
        annotation: "Corruption → RaptorQ parity repairs automatically",
      };
    case 4:
      return {
        blocks: [
          { label: "v1", color: "#14b8a6", status: "ok" },
          { label: "v2", color: "#14b8a6", status: "ok" },
          { label: "v3", color: "#38bdf8", status: "ok" },
          { label: "Parity", color: "#0d9488" },
          { label: "→", color: "#115e59" },
        ],
        annotation: "Time-travel: any version instantly retrievable",
        badge: {
          text: "SUPPORTED",
          color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
        },
      };
    case 5:
      return {
        blocks: [
          { label: "Seg 1", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "Seg 2", color: "#14b8a6" },
          { label: "Parity", color: "#0d9488" },
          { label: "→", color: "#115e59" },
        ],
        annotation: "Self-healing, time-travel, append-only safety, ~20% more disk",
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
          Compatibility Mode
        </h4>
        <ul className="space-y-1.5 text-[11px] text-slate-400">
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Drop-in .sqlite3
            replacement
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Works with existing tooling
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Smaller file size
          </li>
          <li className="flex items-center gap-2">
            <X className="h-3 w-3 text-red-400 flex-shrink-0" /> No self-healing
          </li>
          <li className="flex items-center gap-2">
            <X className="h-3 w-3 text-red-400 flex-shrink-0" /> No time-travel
          </li>
        </ul>
      </div>
      <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
        <h4 className="text-xs font-black text-white mb-2 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-teal-400" />
          Native ECS Mode
        </h4>
        <ul className="space-y-1.5 text-[11px] text-slate-400">
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> RaptorQ self-healing
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Time-travel queries
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Append-only safety
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Content-addressed pages
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-amber-400 flex-shrink-0" /> ~20% more disk usage
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
      description="Compatibility mode for drop-in migration. Native ECS mode when durability matters more than disk space."
      minHeight={440}
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Side-by-side panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModePanel
            title="Compatibility (.sqlite3)"
            icon={<Database className="h-4 w-4 text-slate-400" />}
            color="#64748b"
            vis={compatVis}
            step={step}
            prefersReducedMotion={prefersReducedMotion}
          />
          <ModePanel
            title="Native ECS"
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
              You are comparing FrankenSQLite&apos;s two storage modes side by side.{" "}
              <strong>Compatibility mode</strong> (left) reads and writes standard{" "}
              <code>.sqlite3</code> files, maintaining byte-level compatibility with C SQLite and
              every existing SQLite tool.{" "}
              <strong>
                Native <FrankenJargon term="ecs">ECS</FrankenJargon> mode
              </strong>{" "}
              (right) uses an append-only{" "}
              <FrankenJargon term="ecs">Erasure-Coded Stream</FrankenJargon> format with built-in{" "}
              <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> self-healing.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Step through the 6 stages to see how the same write operation flows through each mode.
              In Compatibility mode, observe the traditional page-update path with journaling. In{" "}
              <FrankenJargon term="ecs">ECS</FrankenJargon> mode, observe the append-only path where
              new <FrankenJargon term="cow">page versions</FrankenJargon> and{" "}
              <FrankenJargon term="repair-symbol">repair symbols</FrankenJargon> are written
              sequentially. Notice where the two modes diverge: in-place update vs. append, no
              repair symbols vs. full <FrankenJargon term="raptorq">RaptorQ</FrankenJargon>{" "}
              coverage.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Compatibility mode lets you adopt FrankenSQLite with zero migration effort: your
              existing databases, backup tools, and SQLite utilities continue to work unchanged.
              When durability requirements exceed what the filesystem provides, switching to native{" "}
              <FrankenJargon term="ecs">ECS</FrankenJargon> mode adds{" "}
              <FrankenJargon term="raptorq">RaptorQ</FrankenJargon> self-healing,{" "}
              <FrankenJargon term="content-addressed">content-addressed</FrankenJargon> page
              versions, and append-only crash safety at the cost of additional disk space. You
              choose the trade-off per database.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
