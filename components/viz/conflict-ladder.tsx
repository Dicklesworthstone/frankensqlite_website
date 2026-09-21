"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScenarioDef {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  steps: Step[];
}

type TxnStatus = "idle" | "writing" | "committed" | "conflict" | "retrying";

interface TxnState {
  label: string;
  page: string;
  cells: string;
  status: TxnStatus;
}

interface StepVisual {
  txnA: TxnState;
  txnB: TxnState;
  /** Which decision-tree nodes are highlighted */
  activeNodes: string[];
  /** Arrow between txns: "none" | "independent" | "merge" | "conflict" */
  relation: "none" | "independent" | "merge" | "conflict";
  /** Annotation text shown in the center area */
  annotation: string;
}

/* ------------------------------------------------------------------ */
/*  Scenario definitions                                               */
/* ------------------------------------------------------------------ */

const scenarios: ScenarioDef[] = [
  {
    id: 0,
    title: "Non-conflicting writes",
    subtitle: "Different pages -- fast path",
    color: "#22c55e",
    steps: [
      {
        label: "Txn A writes Page 3, Txn B writes Page 7",
        description:
          "Two concurrent transactions modify completely separate B-tree pages. Different pages means zero overlap in the data they touch.",
      },
      {
        label: "Both pages modified independently",
        description:
          "The engine checks write-sets and finds no shared pages. Each transaction wrote to its own copy-on-write shadow page, so there is nothing to reconcile.",
      },
      {
        label: "Both commit successfully",
        description:
          "First-Committer-Wins passes trivially because there is no contested page. Both transactions commit without any merge step.",
      },
    ],
  },
  {
    id: 1,
    title: "Commuting writes",
    subtitle: "Same page, different cells",
    color: "#eab308",
    steps: [
      {
        label: "Txn A writes Page 5 cell [0-49], Txn B writes Page 5 cell [50-99]",
        description:
          "Both transactions touch the same B-tree page, but write to disjoint cell ranges. The writes are independent even though the page is shared.",
      },
      {
        label: "First-Committer-Wins -- Txn A commits first",
        description:
          "Txn A reaches the commit point first and its changes are serialized. Txn B must now prove its writes are compatible before it can commit too.",
      },
      {
        label: "Safe Merge Ladder -- operations commute",
        description:
          '"Commuting" means the order doesn\'t matter: applying A then B produces the same page as applying B then A. The ladder inspects cell-level write-sets and confirms the operations commute.',
      },
      {
        label: "Deterministic rebase succeeds -- both committed",
        description:
          "Txn B rebases its changes onto Txn A's committed page state. Because the cell ranges don't overlap, the rebase produces a deterministic result and both transactions commit.",
      },
    ],
  },
  {
    id: 2,
    title: "True conflict",
    subtitle: "Same cell -- must retry",
    color: "#ef4444",
    steps: [
      {
        label: "Both Txn A and Txn B modify Page 5 cell [42]",
        description:
          "Both transactions write to the exact same cell on the same page. This is the only scenario where a real conflict exists.",
      },
      {
        label: "SSI Check -- rw-antidependency detected",
        description:
          "SSI tracks which pages each transaction read and wrote. It detects a read-write anti-dependency cycle: each transaction read the old value of cell [42] before the other wrote it.",
      },
      {
        label: "First-Committer-Wins -- Txn A committed",
        description:
          "Txn A reaches the commit point first and wins. Txn B must now attempt the safe merge ladder to see if its changes can still be applied.",
      },
      {
        label: "Safe merge fails -- byte-level overlap on cell [42]",
        description:
          "The merge ladder tries every strategy but cannot reconcile: both transactions wrote to identical byte offsets within the page. No safe reordering exists.",
      },
      {
        label: "Txn B receives SQLITE_BUSY_SNAPSHOT, retries",
        description:
          "Txn B is aborted with SQLITE_BUSY_SNAPSHOT. It must start over with a fresh snapshot that includes Txn A's committed changes, then re-apply its logic.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Per-step visual state derivation                                   */
/* ------------------------------------------------------------------ */

function getVisual(scenarioId: number, step: number): StepVisual {
  // Scenario 0: Non-conflicting writes
  if (scenarioId === 0) {
    const visuals: StepVisual[] = [
      {
        txnA: { label: "Txn A", page: "Page 3", cells: "*", status: "writing" },
        txnB: { label: "Txn B", page: "Page 7", cells: "*", status: "writing" },
        activeNodes: ["start"],
        relation: "independent",
        annotation: "Writing to different pages",
      },
      {
        txnA: { label: "Txn A", page: "Page 3", cells: "*", status: "writing" },
        txnB: { label: "Txn B", page: "Page 7", cells: "*", status: "writing" },
        activeNodes: ["start", "page-check"],
        relation: "independent",
        annotation: "No page overlap detected",
      },
      {
        txnA: { label: "Txn A", page: "Page 3", cells: "*", status: "committed" },
        txnB: { label: "Txn B", page: "Page 7", cells: "*", status: "committed" },
        activeNodes: ["start", "page-check", "commit"],
        relation: "independent",
        annotation: "Both committed successfully",
      },
    ];
    return visuals[step] ?? visuals[0];
  }

  // Scenario 1: Commuting writes
  if (scenarioId === 1) {
    const visuals: StepVisual[] = [
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "[0-49]", status: "writing" },
        txnB: { label: "Txn B", page: "Page 5", cells: "[50-99]", status: "writing" },
        activeNodes: ["start"],
        relation: "merge",
        annotation: "Same page, different cell ranges",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "[0-49]", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "[50-99]", status: "writing" },
        activeNodes: ["start", "page-check", "fcw"],
        relation: "merge",
        annotation: "First-Committer-Wins: Txn A commits",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "[0-49]", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "[50-99]", status: "writing" },
        activeNodes: ["start", "page-check", "fcw", "merge-check"],
        relation: "merge",
        annotation: "Safe merge ladder: operations commute",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "[0-49]", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "[50-99]", status: "committed" },
        activeNodes: ["start", "page-check", "fcw", "merge-check", "commit"],
        relation: "merge",
        annotation: "Deterministic rebase succeeds",
      },
    ];
    return visuals[step] ?? visuals[0];
  }

  // Scenario 2: True conflict
  const visuals: StepVisual[] = [
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "[42]", status: "writing" },
      txnB: { label: "Txn B", page: "Page 5", cells: "[42]", status: "writing" },
      activeNodes: ["start"],
      relation: "conflict",
      annotation: "Both write to cell [42] on Page 5",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "[42]", status: "writing" },
      txnB: { label: "Txn B", page: "Page 5", cells: "[42]", status: "writing" },
      activeNodes: ["start", "page-check", "ssi"],
      relation: "conflict",
      annotation: "SSI: rw-antidependency detected",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "[42]", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "[42]", status: "writing" },
      activeNodes: ["start", "page-check", "ssi", "fcw"],
      relation: "conflict",
      annotation: "First-Committer-Wins: Txn A commits",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "[42]", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "[42]", status: "conflict" },
      activeNodes: ["start", "page-check", "ssi", "fcw", "merge-check"],
      relation: "conflict",
      annotation: "Safe merge fails: byte-level overlap",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "[42]", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "[42]", status: "retrying" },
      activeNodes: ["start", "page-check", "ssi", "fcw", "merge-check", "abort"],
      relation: "conflict",
      annotation: "SQLITE_BUSY_SNAPSHOT -- Txn B retries",
    },
  ];
  return visuals[step] ?? visuals[0];
}

/* ------------------------------------------------------------------ */
/*  SVG sub-components                                                 */
/* ------------------------------------------------------------------ */

const statusColors: Record<TxnStatus, string> = {
  idle: "#64748b",
  writing: "#38bdf8",
  committed: "#22c55e",
  conflict: "#ef4444",
  retrying: "#f59e0b",
};

const statusLabels: Record<TxnStatus, string> = {
  idle: "Idle",
  writing: "Writing...",
  committed: "Committed",
  conflict: "Conflict!",
  retrying: "Retrying...",
};

function TxnCard({ x, y, txn }: { x: number; y: number; txn: TxnState }) {
  const prefersReducedMotion = useReducedMotion();
  const fill = statusColors[txn.status];
  const w = 150;
  const h = 90;

  return (
    <motion.g
      initial={prefersReducedMotion ? false : { opacity: 0, y: y - 8 }}
      animate={{ opacity: 1, y }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: "easeOut" }}
    >
      {/* Card background */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="#0a0a0a"
        stroke={fill}
        strokeWidth={1.5}
      />
      {/* Glow */}
      <motion.rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="none"
        stroke={fill}
        strokeWidth={2}
        animate={prefersReducedMotion ? { opacity: 0.35 } : { opacity: [0.2, 0.5, 0.2] }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      />
      {/* Label */}
      <text
        x={x + w / 2}
        y={y + 22}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={14}
        fontWeight={700}
      >
        {txn.label}
      </text>
      {/* Page + cells */}
      <text x={x + w / 2} y={y + 42} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        {txn.page} cell {txn.cells}
      </text>
      {/* Status */}
      <text x={x + w / 2} y={y + 62} textAnchor="middle" fill={fill} fontSize={11} fontWeight={600}>
        {statusLabels[txn.status]}
      </text>
      {/* Status icon */}
      {txn.status === "committed" && (
        <motion.circle
          cx={x + w / 2}
          cy={y + 78}
          r={5}
          fill="#22c55e"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        />
      )}
      {txn.status === "conflict" && (
        <motion.circle
          cx={x + w / 2}
          cy={y + 78}
          r={5}
          fill="#ef4444"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        />
      )}
      {txn.status === "retrying" && (
        <motion.circle
          cx={x + w / 2}
          cy={y + 78}
          r={5}
          fill="#f59e0b"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500 }}
        />
      )}
    </motion.g>
  );
}

/** Decision tree node rendered inside the SVG */
function DecisionNode({
  id,
  x,
  y,
  label,
  active,
  variant,
}: {
  id: string;
  x: number;
  y: number;
  label: string;
  active: boolean;
  variant: "neutral" | "success" | "fail";
}) {
  const colorMap = {
    neutral: { bg: "#1e293b", border: "#475569", text: "#cbd5e1" },
    success: { bg: "#052e16", border: "#22c55e", text: "#86efac" },
    fail: { bg: "#2a0a0a", border: "#ef4444", text: "#fca5a5" },
  };
  const c = active ? colorMap[variant] : { bg: "#111318", border: "#1e293b", text: "#475569" };
  const w = 160;
  const h = 30;

  return (
    <motion.g
      data-node-id={id}
      animate={{ opacity: active ? 1 : 0.35 }}
      transition={{ duration: 0.3 }}
    >
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={6}
        fill={c.bg}
        stroke={c.border}
        strokeWidth={active ? 1.5 : 0.5}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill={c.text}
        fontSize={10}
        fontWeight={active ? 700 : 400}
      >
        {label}
      </text>
    </motion.g>
  );
}

/** Arrow line between two points */
function Arrow({
  x1,
  y1,
  x2,
  y2,
  active,
  color = "#475569",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
  color?: string;
}) {
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={active ? color : "#1e293b"}
      strokeWidth={active ? 1.5 : 0.5}
      strokeDasharray={active ? "none" : "4 3"}
      animate={{ opacity: active ? 1 : 0.2 }}
      transition={{ duration: 0.3 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ConflictLadder() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const scenario = scenarios[scenarioIdx];
  const visual = useMemo(() => getVisual(scenarioIdx, currentStep), [scenarioIdx, currentStep]);

  const handleScenarioChange = useCallback((idx: number) => {
    setScenarioIdx(idx);
    setCurrentStep(0);
  }, []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Decision tree node definitions and layout
  const isActive = (id: string) => visual.activeNodes.includes(id);

  // Determine node variant based on scenario + node
  const nodeVariant = (id: string): "neutral" | "success" | "fail" => {
    if (!isActive(id)) return "neutral";
    if (id === "commit") return "success";
    if (id === "abort") return "fail";
    if (id === "merge-check") {
      return scenarioIdx === 2 ? "fail" : "neutral";
    }
    return "neutral";
  };

  // SVG dimensions
  const svgW = 600;
  const svgH = 380;

  // Layout positions
  const txnAx = 40;
  const txnBx = svgW - 190;
  const txnY = 10;
  const centerX = svgW / 2;

  // Decision tree Y positions
  const treeStartY = 140;
  const treeGap = 44;
  const nodePositions: Record<string, { x: number; y: number; label: string }> = {
    start: { x: centerX, y: treeStartY, label: "Begin Commit" },
    "page-check": {
      x: centerX,
      y: treeStartY + treeGap,
      label: "Page Overlap Check",
    },
    ssi: {
      x: centerX - 80,
      y: treeStartY + treeGap * 2,
      label: "SSI Dependency",
    },
    fcw: {
      x: centerX,
      y: treeStartY + treeGap * 2,
      label: "First-Committer-Wins",
    },
    "merge-check": {
      x: centerX,
      y: treeStartY + treeGap * 3,
      label: "Safe Merge Ladder",
    },
    commit: {
      x: centerX - 80,
      y: treeStartY + treeGap * 4,
      label: "Commit OK",
    },
    abort: {
      x: centerX + 80,
      y: treeStartY + treeGap * 4,
      label: "SQLITE_BUSY",
    },
  };

  // Edge definitions: [from, to]
  const edges: [string, string][] = [
    ["start", "page-check"],
    ["page-check", "fcw"],
    ["page-check", "ssi"],
    ["ssi", "fcw"],
    ["fcw", "merge-check"],
    ["merge-check", "commit"],
    ["merge-check", "abort"],
  ];

  // Which edges are active is derived from active nodes
  const activeEdges = edges.filter(([from, to]) => isActive(from) && isActive(to));

  // Which nodes to render (skip ssi for scenario 0 and 1)
  const visibleNodes =
    scenarioIdx === 2
      ? Object.keys(nodePositions)
      : Object.keys(nodePositions).filter((k) => k !== "ssi" && k !== "abort");

  return (
    <VizContainer
      title="Write Conflict Resolution Ladder"
      description={
        <>
          Step through three scenarios to see how FrankenSQLite resolves concurrent B-tree page
          modifications using <FrankenJargon term="fcw">First-Committer-Wins</FrankenJargon> and the{" "}
          <FrankenJargon term="safe-merge-ladder">safe merge ladder</FrankenJargon>.
        </>
      }
      minHeight={520}
    >
      <div className="p-3 md:p-6 flex flex-col gap-4">
        {/* Scenario selector */}
        <div className="flex flex-wrap gap-2">
          {scenarios.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handleScenarioChange(i)}
              className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-bold tracking-wide border transition-all ${
                scenarioIdx === i
                  ? "border-teal-500/60 bg-teal-500/10 text-teal-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.title}
            </button>
          ))}
        </div>

        {/* Scenario subtitle */}
        <AnimatePresence mode="wait">
          <motion.div
            key={scenarioIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>{scenario.subtitle}</span>
          </motion.div>
        </AnimatePresence>

        {/* SVG visualization — horizontally scrollable on very small screens */}
        <div className="relative w-full overflow-hidden group">
          {/* Mobile swipe hint */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 md:hidden pointer-events-none opacity-60 transition-opacity group-hover:opacity-0 delay-1000">
            <div className="bg-black/50 backdrop-blur-sm text-[10px] text-white/70 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
              <span>←</span>
              <span>Swipe to explore</span>
              <span>→</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto touch-pan-x scrollbar-hide pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${scenarioIdx}-${currentStep}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-auto min-w-[600px] md:min-w-full mx-auto"
                  style={{ minHeight: 240 }}
                >
                  {/* Defs for arrow markers */}
                  <defs>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX={8}
                      refY={5}
                      markerWidth={6}
                      markerHeight={6}
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                    </marker>
                    <marker
                      id="arrow-inactive"
                      viewBox="0 0 10 10"
                      refX={8}
                      refY={5}
                      markerWidth={6}
                      markerHeight={6}
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
                    </marker>
                  </defs>

                  {/* Transaction cards */}
                  <TxnCard x={txnAx} y={txnY} txn={visual.txnA} />
                  <TxnCard x={txnBx} y={txnY} txn={visual.txnB} />

                  {/* Lines from txn cards to decision tree start */}
                  <Arrow
                    x1={txnAx + 75}
                    y1={txnY + 90}
                    x2={centerX}
                    y2={treeStartY - 15}
                    active={isActive("start")}
                    color="#94a3b8"
                  />
                  <Arrow
                    x1={txnBx + 75}
                    y1={txnY + 90}
                    x2={centerX}
                    y2={treeStartY - 15}
                    active={isActive("start")}
                    color="#94a3b8"
                  />

                  {/* Decision tree edges */}
                  {edges.map(([from, to]) => {
                    if (!visibleNodes.includes(from) || !visibleNodes.includes(to)) return null;
                    const a = nodePositions[from];
                    const b = nodePositions[to];
                    const edgeActive = activeEdges.some(([ef, et]) => ef === from && et === to);
                    return (
                      <Arrow
                        key={`${from}-${to}`}
                        x1={a.x}
                        y1={a.y + 15}
                        x2={b.x}
                        y2={b.y - 15}
                        active={edgeActive}
                        color={edgeActive ? "#94a3b8" : "#1e293b"}
                      />
                    );
                  })}

                  {/* Decision tree nodes */}
                  {visibleNodes.map((id) => {
                    const n = nodePositions[id];
                    return (
                      <DecisionNode
                        key={id}
                        id={id}
                        x={n.x}
                        y={n.y}
                        label={n.label}
                        active={isActive(id)}
                        variant={nodeVariant(id)}
                      />
                    );
                  })}

                  {/* Center annotation */}
                  <motion.text
                    x={centerX}
                    y={svgH - 20}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={12}
                    fontWeight={600}
                    key={visual.annotation}
                    initial={{ opacity: 0, y: svgH - 12 }}
                    animate={{ opacity: 1, y: svgH - 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {visual.annotation}
                  </motion.text>

                  {/* Relation indicator between txn cards */}
                  {visual.relation === "independent" && (
                    <motion.text
                      x={centerX}
                      y={txnY + 50}
                      textAnchor="middle"
                      fill="#22c55e"
                      fontSize={18}
                      fontWeight={700}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {"| |"}
                    </motion.text>
                  )}
                  {visual.relation === "merge" && (
                    <motion.text
                      x={centerX}
                      y={txnY + 50}
                      textAnchor="middle"
                      fill="#eab308"
                      fontSize={18}
                      fontWeight={700}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {"\u2194"}
                    </motion.text>
                  )}
                  {visual.relation === "conflict" && (
                    <motion.text
                      x={centerX}
                      y={txnY + 50}
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize={18}
                      fontWeight={700}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 0.6, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {"\u26A1"}
                    </motion.text>
                  )}

                  {/* Result icons for committed / conflict */}
                  {visual.txnA.status === "committed" && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                    >
                      <circle
                        cx={txnAx + 150 + 14}
                        cy={txnY + 14}
                        r={10}
                        fill="#052e16"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                      />
                      <text
                        x={txnAx + 150 + 14}
                        y={txnY + 18}
                        textAnchor="middle"
                        fill="#22c55e"
                        fontSize={12}
                        fontWeight={700}
                      >
                        {"\u2713"}
                      </text>
                    </motion.g>
                  )}
                  {visual.txnB.status === "committed" && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, delay: 0.15 }}
                    >
                      <circle
                        cx={txnBx - 14}
                        cy={txnY + 14}
                        r={10}
                        fill="#052e16"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                      />
                      <text
                        x={txnBx - 14}
                        y={txnY + 18}
                        textAnchor="middle"
                        fill="#22c55e"
                        fontSize={12}
                        fontWeight={700}
                      >
                        {"\u2713"}
                      </text>
                    </motion.g>
                  )}
                  {visual.txnB.status === "conflict" && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, delay: 0.15 }}
                    >
                      <circle
                        cx={txnBx - 14}
                        cy={txnY + 14}
                        r={10}
                        fill="#2a0a0a"
                        stroke="#ef4444"
                        strokeWidth={1.5}
                      />
                      <text
                        x={txnBx - 14}
                        y={txnY + 18}
                        textAnchor="middle"
                        fill="#ef4444"
                        fontSize={12}
                        fontWeight={700}
                      >
                        {"\u2717"}
                      </text>
                    </motion.g>
                  )}
                  {visual.txnB.status === "retrying" && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, delay: 0.15 }}
                    >
                      <circle
                        cx={txnBx - 14}
                        cy={txnY + 14}
                        r={10}
                        fill="#1c1a05"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                      />
                      <text
                        x={txnBx - 14}
                        y={txnY + 18}
                        textAnchor="middle"
                        fill="#f59e0b"
                        fontSize={12}
                        fontWeight={700}
                      >
                        {"\u21BB"}
                      </text>
                    </motion.g>
                  )}
                </svg>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Stepper controls */}
        <Stepper
          steps={scenario.steps}
          currentStep={currentStep}
          onStepChange={handleStepChange}
          autoPlayInterval={2500}
        />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a decision tree for FrankenSQLite&apos;s conflict resolution logic.
              Two concurrent transactions have modified the same{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> and are trying to commit. The
              tree shows which resolution strategy the{" "}
              <FrankenJargon term="safe-merge-ladder">Safe Merge Ladder</FrankenJargon> selects
              based on the nature of the conflict.
            </p>
            <p>
              Three scenarios demonstrate the spectrum: non-conflicting writes (different cells on
              the same page), commuting writes (independent operations that can be reordered), and
              true conflicts (overlapping byte ranges that cannot be merged).
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Switch between the three scenario tabs to see different conflict types. Step through
              each scenario to watch the decision tree highlight the active node and update the
              transaction status cards. In the non-conflicting scenario, both transactions commit
              immediately. In the commuting scenario,{" "}
              <FrankenJargon term="foata">FOATA reordering</FrankenJargon> finds a valid merge. In
              the true conflict scenario, the engine falls through to abort.
            </p>
            <p>
              Pay attention to how each rung of the ladder handles a wider class of conflicts than
              the one above it.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              In production workloads, the vast majority of &ldquo;conflicts&rdquo; are false
              positives caused by page-level granularity: two transactions happen to land on the
              same physical page even though they modify completely different rows. The{" "}
              <FrankenJargon term="safe-merge-ladder">Safe Merge Ladder</FrankenJargon> converts
              over 90% of these would-be <code>SQLITE_BUSY</code> errors into transparent background
              merges, preserving throughput that a traditional single-writer engine would sacrifice.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
