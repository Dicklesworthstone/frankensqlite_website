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

type TxnStatus = "idle" | "writing" | "committed" | "conflict" | "retrying" | "designed";

interface TxnState {
  label: string;
  page: string;
  cells: string;
  status: TxnStatus;
}

type NodeVariant = "neutral" | "success" | "fail" | "dormant";

interface StepVisual {
  txnA: TxnState;
  txnB: TxnState;
  /** Which decision-tree nodes are highlighted */
  activeNodes: string[];
  /** Per-node color overrides for this step (commit/abort have defaults) */
  variants?: Record<string, NodeVariant>;
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
    title: "Different pages",
    subtitle: "No shared page: both commit (live path today)",
    color: "#22c55e",
    steps: [
      {
        label: "Txn A writes Page 3, Txn B writes Page 7",
        description:
          "Two concurrent transactions change different B-tree pages. Each takes its own page lock and builds private new versions of its own page.",
      },
      {
        label: "First-committer-wins: no base drift",
        description:
          "At commit, first-committer-wins checks whether any page the transaction wrote has gained a newer committed version since its snapshot. Page 3 and Page 7 are separate, so neither has.",
      },
      {
        label: "SSI check passes, both commit",
        description:
          "The SSI check finds no transaction with read-write antidependencies both coming in and going out, so both commit. This is the live path today; no merge step is involved.",
      },
    ],
  },
  {
    id: 1,
    title: "Same page, different rows",
    subtitle: "Today: the later committer retries. With the dormant ladder: rebase would commit both.",
    color: "#eab308",
    steps: [
      {
        label: "A updates rowid 12, B updates rowid 87, both on Page 5",
        description:
          "Both transactions start from the same snapshot and change different rows that happen to live on the same leaf page. Neither change depends on the other.",
      },
      {
        label: "Txn A commits first",
        description:
          "A takes Page 5's lock, writes its version, and commits; the lock is released at commit. (Had B touched Page 5 while A still held the lock, B would have gotten SQLITE_BUSY right away.)",
      },
      {
        label: "Txn B: first-committer-wins finds base drift",
        description:
          "B changed Page 5 starting from its older snapshot. At commit, first-committer-wins sees that Page 5 now has a newer committed version than the one B started from.",
      },
      {
        label: "Today: SQLITE_BUSY_SNAPSHOT, B retries",
        description:
          "The live commit path does not try to merge. B gets SQLITE_BUSY_SNAPSHOT and the application retries it from a fresh snapshot. The result is correct, but it costs a retry for a change that never really conflicted.",
      },
      {
        label: "Designed: deterministic rebase would commit B",
        description:
          "With the dormant merge ladder wired in, B's recorded intent ('update rowid 87') would be replayed against A's committed page, with B-tree invariants and constraints checked. The rows differ, so the replay would succeed and both would commit. The code exists and is tested; the live commit path does not call it yet.",
      },
    ],
  },
  {
    id: 2,
    title: "Same row",
    subtitle: "A real conflict: retry today, and retry by design",
    color: "#ef4444",
    steps: [
      {
        label: "A and B both change rowid 42 on Page 5",
        description:
          "Both transactions read rowid 42 and write a new value based on what they read. This is a real conflict: whichever commits second was working from stale data.",
      },
      {
        label: "Txn A commits first",
        description: "A takes Page 5's lock, writes its version, and commits.",
      },
      {
        label: "Txn B: first-committer-wins finds base drift",
        description:
          "Page 5 now has a newer committed version than B's snapshot, so B cannot simply commit its copy of the page.",
      },
      {
        label: "The merge ladder would not help",
        description:
          "Rebase is ruled out because B's change depends on a value it read, which A has since changed. A structured page patch is ruled out because both changed the same cell. The ladder falls through to its last rung.",
      },
      {
        label: "B gets SQLITE_BUSY_SNAPSHOT and retries",
        description:
          "B is aborted with SQLITE_BUSY_SNAPSHOT and the application retries it from a fresh snapshot that includes A's change. Today's engine reaches this result directly, without trying the ladder.",
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
        txnA: { label: "Txn A", page: "Page 3", cells: "its rows", status: "writing" },
        txnB: { label: "Txn B", page: "Page 7", cells: "its rows", status: "writing" },
        activeNodes: ["start"],
        relation: "independent",
        annotation: "Writing to different pages",
      },
      {
        txnA: { label: "Txn A", page: "Page 3", cells: "its rows", status: "writing" },
        txnB: { label: "Txn B", page: "Page 7", cells: "its rows", status: "writing" },
        activeNodes: ["start", "fcw"],
        variants: { fcw: "success" },
        relation: "independent",
        annotation: "FCW: no base drift on either page",
      },
      {
        txnA: { label: "Txn A", page: "Page 3", cells: "its rows", status: "committed" },
        txnB: { label: "Txn B", page: "Page 7", cells: "its rows", status: "committed" },
        activeNodes: ["start", "fcw", "ssi", "commit"],
        variants: { fcw: "success", ssi: "success" },
        relation: "independent",
        annotation: "Both committed",
      },
    ];
    return visuals[step] ?? visuals[0];
  }

  // Scenario 1: Same page, different rows
  if (scenarioId === 1) {
    const visuals: StepVisual[] = [
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "rowid 12", status: "writing" },
        txnB: { label: "Txn B", page: "Page 5", cells: "rowid 87", status: "writing" },
        activeNodes: ["start"],
        relation: "merge",
        annotation: "Same page, different rows",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "rowid 12", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "rowid 87", status: "writing" },
        activeNodes: ["start", "fcw"],
        variants: { fcw: "success" },
        relation: "merge",
        annotation: "Txn A commits first",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "rowid 12", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "rowid 87", status: "writing" },
        activeNodes: ["start", "fcw"],
        variants: { fcw: "fail" },
        relation: "merge",
        annotation: "Txn B: Page 5 changed since its snapshot",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "rowid 12", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "rowid 87", status: "retrying" },
        activeNodes: ["start", "fcw", "merge-check", "abort"],
        variants: { fcw: "fail", "merge-check": "dormant" },
        relation: "merge",
        annotation: "Today: ladder not wired, B gets SQLITE_BUSY_SNAPSHOT",
      },
      {
        txnA: { label: "Txn A", page: "Page 5", cells: "rowid 12", status: "committed" },
        txnB: { label: "Txn B", page: "Page 5", cells: "rowid 87", status: "designed" },
        activeNodes: ["start", "fcw", "merge-check", "commit"],
        variants: { fcw: "fail", "merge-check": "success" },
        relation: "merge",
        annotation: "Design (dormant): rebase replays B's intent, both commit",
      },
    ];
    return visuals[step] ?? visuals[0];
  }

  // Scenario 2: Same row
  const visuals: StepVisual[] = [
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "rowid 42", status: "writing" },
      txnB: { label: "Txn B", page: "Page 5", cells: "rowid 42", status: "writing" },
      activeNodes: ["start"],
      relation: "conflict",
      annotation: "Both change rowid 42 on Page 5",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "rowid 42", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "rowid 42", status: "writing" },
      activeNodes: ["start", "fcw"],
      variants: { fcw: "success" },
      relation: "conflict",
      annotation: "Txn A commits first",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "rowid 42", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "rowid 42", status: "writing" },
      activeNodes: ["start", "fcw"],
      variants: { fcw: "fail" },
      relation: "conflict",
      annotation: "Txn B: Page 5 changed since its snapshot",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "rowid 42", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "rowid 42", status: "conflict" },
      activeNodes: ["start", "fcw", "merge-check"],
      variants: { fcw: "fail", "merge-check": "fail" },
      relation: "conflict",
      annotation: "Rebase and cell patch both ruled out",
    },
    {
      txnA: { label: "Txn A", page: "Page 5", cells: "rowid 42", status: "committed" },
      txnB: { label: "Txn B", page: "Page 5", cells: "rowid 42", status: "retrying" },
      activeNodes: ["start", "fcw", "merge-check", "abort"],
      variants: { fcw: "fail", "merge-check": "fail" },
      relation: "conflict",
      annotation: "SQLITE_BUSY_SNAPSHOT: Txn B retries",
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
  designed: "#fb923c",
};

const statusLabels: Record<TxnStatus, string> = {
  idle: "Idle",
  writing: "Writing...",
  committed: "Committed",
  conflict: "Conflict",
  retrying: "BUSY_SNAPSHOT, retrying",
  designed: "Would commit (dormant)",
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
        {txn.page} · {txn.cells}
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
      {txn.status === "designed" && (
        <motion.circle
          cx={x + w / 2}
          cy={y + 78}
          r={5}
          fill="none"
          stroke="#fb923c"
          strokeWidth={1.5}
          strokeDasharray="2 2"
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
  variant: NodeVariant;
}) {
  const colorMap = {
    neutral: { bg: "#1e293b", border: "#475569", text: "#cbd5e1" },
    success: { bg: "#052e16", border: "#22c55e", text: "#86efac" },
    fail: { bg: "#2a0a0a", border: "#ef4444", text: "#fca5a5" },
    dormant: { bg: "#1c1305", border: "#fb923c", text: "#fdba74" },
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

  // Determine node variant based on the step's overrides + node defaults
  const nodeVariant = (id: string): NodeVariant => {
    if (!isActive(id)) return "neutral";
    const override = visual.variants?.[id];
    if (override) return override;
    if (id === "commit") return "success";
    if (id === "abort") return "fail";
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

  // Decision tree positions. Order matches the engine: first-committer-wins
  // runs first; SSI runs only when FCW passes; the (dormant) merge ladder would
  // sit on the base-drift branch.
  const treeStartY = 140;
  const nodePositions: Record<string, { x: number; y: number; label: string }> = {
    start: { x: centerX, y: treeStartY, label: "Begin commit" },
    fcw: {
      x: centerX,
      y: treeStartY + 46,
      label: "FCW: base drift?",
    },
    ssi: {
      x: centerX - 130,
      y: treeStartY + 100,
      label: "No drift: SSI check",
    },
    "merge-check": {
      x: centerX + 130,
      y: treeStartY + 100,
      label: "Merge ladder (dormant)",
    },
    commit: {
      x: centerX,
      y: treeStartY + 160,
      label: "Commit OK",
    },
    abort: {
      x: centerX + 180,
      y: treeStartY + 160,
      label: "SQLITE_BUSY_SNAPSHOT",
    },
  };

  // Edge definitions: [from, to]
  const edges: [string, string][] = [
    ["start", "fcw"],
    ["fcw", "ssi"],
    ["fcw", "merge-check"],
    ["ssi", "commit"],
    ["merge-check", "commit"],
    ["merge-check", "abort"],
  ];

  // Which edges are active is derived from active nodes
  const activeEdges = edges.filter(([from, to]) => isActive(from) && isActive(to));

  const visibleNodes = Object.keys(nodePositions);

  return (
    <VizContainer
      title="Write Conflict Resolution Ladder"
      description={
        <>
          Step through three scenarios. Today the live engine settles every same-page conflict
          with <FrankenJargon term="fcw">first-committer-wins</FrankenJargon>: the later committer
          gets <code>SQLITE_BUSY_SNAPSHOT</code> and retries. The{" "}
          <FrankenJargon term="safe-merge-ladder">safe merge ladder</FrankenJargon> (deterministic
          rebase, then structured page patches, then abort) is built and tested but not yet wired
          into the commit path.
        </>
      }
      minHeight={520}
      status="dormant"
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
              A decision tree for what happens when a transaction commits. First-committer-wins
              checks every page it wrote for base drift: a newer committed version of the{" "}
              <FrankenJargon term="btree">B-tree page</FrankenJargon> than the one its snapshot
              saw. No drift leads to the SSI check and, normally, a commit. Drift leads to an abort
              and retry today. The designed{" "}
              <FrankenJargon term="safe-merge-ladder">safe merge ladder</FrankenJargon> would sit on
              that branch.
            </p>
            <p>
              The ladder has three rungs, tried in order: (1){" "}
              <FrankenJargon term="deterministic-rebase">deterministic rebase</FrankenJargon>,
              which replays the transaction&apos;s recorded B-tree intents (insert, update, or
              delete by key) against the newly committed page; (2) a structured page patch, which
              combines the two changes cell by cell when they touched different cells, serializes
              page-header changes, and checks page invariants; (3) abort and retry.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Switch between the three scenarios and step through each one. With different pages,
              both transactions commit on today&apos;s live path. With the same page but different
              rows, the fourth step shows today&apos;s retry and the fifth shows what rebase would
              do once it is wired in. With the same row, no rung applies and the result is a retry
              either way.
            </p>
            <p>
              Orange marks the dormant part: code that exists and is tested but that the live
              commit path does not call yet.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Page-level conflict detection reports a conflict whenever two transactions change
              the same page, even if they touched different rows. On a hot page, such as the last
              leaf of a table that keeps getting appended to, that means extra retries. The merge
              ladder is meant to turn some of those retries into commits without adding row-level
              version metadata. It has not been measured on real workloads, so there is no figure
              for how many conflicts it would resolve.
            </p>
            <p>
              Byte-level XOR merging is deliberately not a rung. On SQLite pages, two edits that
              touch different bytes can still lose an update when a cell moves.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
