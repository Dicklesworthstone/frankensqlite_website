"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CellData {
  id: number;
  value: string;
}

interface PageNode {
  id: string;
  label: string;
  type: "root" | "internal" | "leaf";
  cells: CellData[];
  /** Position in the SVG tree layout (percentage) */
  x: number;
  y: number;
  /** Whether this is a CoW shadow copy */
  isShadow?: boolean;
}

type HighlightState = "none" | "active" | "scanning" | "found" | "cow" | "updated";

/* ------------------------------------------------------------------ */
/*  Tree data                                                          */
/* ------------------------------------------------------------------ */

const ORIGINAL_TREE: PageNode[] = [
  {
    id: "root",
    label: "Root Page",
    type: "root",
    cells: [
      { id: 25, value: "" },
      { id: 50, value: "" },
      { id: 75, value: "" },
    ],
    x: 50,
    y: 8,
  },
  {
    id: "int-left",
    label: "Internal A",
    type: "internal",
    cells: [
      { id: 12, value: "" },
      { id: 25, value: "" },
    ],
    x: 25,
    y: 35,
  },
  {
    id: "int-right",
    label: "Internal B",
    type: "internal",
    cells: [
      { id: 37, value: "" },
      { id: 50, value: "" },
    ],
    x: 75,
    y: 35,
  },
  {
    id: "leaf-1",
    label: "Leaf 1",
    type: "leaf",
    cells: [
      { id: 10, value: "Eve" },
      { id: 12, value: "Dan" },
    ],
    x: 12,
    y: 65,
  },
  {
    id: "leaf-2",
    label: "Leaf 2",
    type: "leaf",
    cells: [
      { id: 25, value: "Carol" },
      { id: 30, value: "Grace" },
    ],
    x: 38,
    y: 65,
  },
  {
    id: "leaf-3",
    label: "Leaf 3",
    type: "leaf",
    cells: [
      { id: 37, value: "Frank" },
      { id: 42, value: "Alice" },
    ],
    x: 62,
    y: 65,
  },
  {
    id: "leaf-4",
    label: "Leaf 4",
    type: "leaf",
    cells: [
      { id: 50, value: "Hank" },
      { id: 55, value: "Ivy" },
    ],
    x: 88,
    y: 65,
  },
];

const EDGES: [string, string][] = [
  ["root", "int-left"],
  ["root", "int-right"],
  ["int-left", "leaf-1"],
  ["int-left", "leaf-2"],
  ["int-right", "leaf-3"],
  ["int-right", "leaf-4"],
];

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

const STEPS: Step[] = [
  {
    label: "Page anatomy",
    description:
      "Data lives in 4KB B-tree pages. The root holds separator keys, internal nodes route traversal, and leaf nodes store rows.",
  },
  {
    label: "Binary search in root",
    description:
      "Looking for key 42. Root keys are [25, 50, 75]. Since 42 falls between 25 and 50, follow the right child pointer.",
  },
  {
    label: "Follow pointer to internal node",
    description:
      "Internal B holds keys [37, 50]. Key 42 is between 37 and 50, so follow the pointer to Leaf 3.",
  },
  {
    label: "Leaf found: key 42",
    description: "Leaf 3 contains cell id=42, name='Alice'. Read complete in 3 page accesses.",
  },
  {
    label: "UPDATE arrives",
    description: "UPDATE users SET name='Bob' WHERE id=42. The write path begins.",
  },
  {
    label: "Copy-on-Write",
    description:
      "The original leaf is never modified. A shadow copy is created with the updated cell. The original stays intact for other readers.",
  },
  {
    label: "Pointer chain update",
    description:
      "Internal B gets its own shadow copy with an updated child pointer to the new leaf. The root gets a new copy pointing to the new internal.",
  },
  {
    label: "Two trees coexist",
    description:
      "Old tree (dimmed) serves existing readers. New tree (teal) serves the committing transaction. This is MVCC: multiple versions, zero conflicts.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: which nodes/edges are highlighted per step                 */
/* ------------------------------------------------------------------ */

interface StepVis {
  /** Node IDs that should glow / be highlighted */
  highlighted: Record<string, HighlightState>;
  /** Edge pairs that are animated */
  activeEdges: [string, string][];
  /** Shadow (CoW) nodes to render */
  shadows: PageNode[];
  /** Which original nodes are dimmed */
  dimmedNodes: Set<string>;
  /** Callout text */
  callout?: string;
  /** Show banner */
  banner?: string;
}

function getStepVis(step: number): StepVis {
  const base: StepVis = {
    highlighted: {},
    activeEdges: [],
    shadows: [],
    dimmedNodes: new Set(),
  };

  switch (step) {
    case 0:
      // All nodes shown normally, root annotated
      base.highlighted = { root: "active" };
      base.callout = "Header  |  Cell Pointers  |  Cells  |  Free Space";
      return base;

    case 1:
      // Root scanning
      base.highlighted = { root: "scanning" };
      base.callout = "25 < 42 < 50 → follow right child";
      return base;

    case 2:
      // Traversal arrow root → int-right
      base.highlighted = { root: "active", "int-right": "scanning" };
      base.activeEdges = [["root", "int-right"]];
      base.callout = "37 < 42 < 50 → follow child to Leaf 3";
      return base;

    case 3:
      // Leaf found
      base.highlighted = { root: "active", "int-right": "active", "leaf-3": "found" };
      base.activeEdges = [
        ["root", "int-right"],
        ["int-right", "leaf-3"],
      ];
      base.callout = "id=42, name='Alice'. Found!";
      return base;

    case 4:
      // UPDATE banner
      base.highlighted = { "leaf-3": "active" };
      base.banner = "UPDATE users SET name='Bob' WHERE id=42";
      return base;

    case 5:
      // CoW: leaf shadow
      base.highlighted = { "leaf-3": "none" };
      base.dimmedNodes = new Set(["leaf-3"]);
      base.shadows = [
        {
          id: "leaf-3-cow",
          label: "Leaf 3'",
          type: "leaf",
          cells: [
            { id: 37, value: "Frank" },
            { id: 42, value: "Bob" },
          ],
          x: 68,
          y: 65,
          isShadow: true,
        },
      ];
      base.callout = "Shadow copy created, original untouched";
      return base;

    case 6:
      // CoW chain: internal + root shadows
      base.dimmedNodes = new Set(["leaf-3", "int-right", "root"]);
      base.shadows = [
        {
          id: "leaf-3-cow",
          label: "Leaf 3'",
          type: "leaf",
          cells: [
            { id: 37, value: "Frank" },
            { id: 42, value: "Bob" },
          ],
          x: 68,
          y: 65,
          isShadow: true,
        },
        {
          id: "int-right-cow",
          label: "Internal B'",
          type: "internal",
          cells: [
            { id: 37, value: "" },
            { id: 50, value: "" },
          ],
          x: 81,
          y: 35,
          isShadow: true,
        },
        {
          id: "root-cow",
          label: "Root'",
          type: "root",
          cells: [
            { id: 25, value: "" },
            { id: 50, value: "" },
            { id: 75, value: "" },
          ],
          x: 56,
          y: 8,
          isShadow: true,
        },
      ];
      base.activeEdges = [
        ["root-cow", "int-right-cow"],
        ["int-right-cow", "leaf-3-cow"],
      ];
      base.callout = "Pointer chain: Root' → Internal B' → Leaf 3'";
      return base;

    case 7:
      // Both trees
      base.dimmedNodes = new Set(["leaf-3", "int-right", "root"]);
      base.shadows = [
        {
          id: "leaf-3-cow",
          label: "Leaf 3'",
          type: "leaf",
          cells: [
            { id: 37, value: "Frank" },
            { id: 42, value: "Bob" },
          ],
          x: 68,
          y: 65,
          isShadow: true,
        },
        {
          id: "int-right-cow",
          label: "Internal B'",
          type: "internal",
          cells: [
            { id: 37, value: "" },
            { id: 50, value: "" },
          ],
          x: 81,
          y: 35,
          isShadow: true,
        },
        {
          id: "root-cow",
          label: "Root'",
          type: "root",
          cells: [
            { id: 25, value: "" },
            { id: 50, value: "" },
            { id: 75, value: "" },
          ],
          x: 56,
          y: 8,
          isShadow: true,
        },
      ];
      base.activeEdges = [
        ["root-cow", "int-right-cow"],
        ["int-right-cow", "leaf-3-cow"],
        ["root-cow", "int-left"],
      ];
      base.callout = "Both versions exist simultaneously: this is MVCC";
      return base;
  }
  return base;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const PAGE_W = 120;
const PAGE_H_ROOT = 64;
const PAGE_H_INTERNAL = 56;
const PAGE_H_LEAF = 64;

function pageHeight(type: PageNode["type"]) {
  if (type === "root") return PAGE_H_ROOT;
  if (type === "internal") return PAGE_H_INTERNAL;
  return PAGE_H_LEAF;
}

function nodeCenter(node: PageNode): { cx: number; cy: number } {
  const h = pageHeight(node.type);
  return { cx: (node.x / 100) * 900, cy: (node.y / 100) * 380 + h / 2 };
}

function PageBlock({
  node,
  highlight,
  dimmed,
  prefersReducedMotion,
}: {
  node: PageNode;
  highlight: HighlightState;
  dimmed: boolean;
  prefersReducedMotion: boolean | null;
}) {
  const h = pageHeight(node.type);
  const x = (node.x / 100) * 900 - PAGE_W / 2;
  const y = (node.y / 100) * 380;

  const glowColor = node.isShadow
    ? "rgba(20,184,166,0.5)"
    : highlight === "found"
      ? "rgba(34,197,94,0.5)"
      : highlight === "scanning"
        ? "rgba(250,204,21,0.4)"
        : highlight === "active"
          ? "rgba(56,189,248,0.3)"
          : "transparent";

  const borderColor = node.isShadow
    ? "#14b8a6"
    : highlight === "found"
      ? "#22c55e"
      : highlight === "scanning"
        ? "#facc15"
        : highlight === "active"
          ? "#38bdf8"
          : "rgba(255,255,255,0.1)";

  const opacity = dimmed ? 0.3 : 1;

  return (
    <motion.g
      initial={node.isShadow ? { opacity: 0, x: -10 } : false}
      animate={{ opacity, x: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
    >
      {/* Glow */}
      {glowColor !== "transparent" && (
        <rect
          x={x - 4}
          y={y - 4}
          width={PAGE_W + 8}
          height={h + 8}
          rx={14}
          fill="none"
          stroke={glowColor}
          strokeWidth={2}
          opacity={0.6}
        />
      )}

      {/* Page body */}
      <rect
        x={x}
        y={y}
        width={PAGE_W}
        height={h}
        rx={10}
        fill={node.isShadow ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.03)"}
        stroke={borderColor}
        strokeWidth={1.5}
      />

      {/* Label */}
      <text
        x={x + PAGE_W / 2}
        y={y + 14}
        textAnchor="middle"
        fill={node.isShadow ? "#14b8a6" : "#94a3b8"}
        fontSize={9}
        fontWeight={800}
        fontFamily="ui-monospace, monospace"
      >
        {node.label}
      </text>

      {/* Cells */}
      {node.cells.map((cell, i) => {
        const cellW = (PAGE_W - 16) / node.cells.length;
        const cx = x + 8 + i * cellW;
        const cy = y + 24;
        const cellH = h - 32;

        const isFocusCell = cell.id === 42;
        const cellFill =
          isFocusCell && (highlight === "found" || node.isShadow)
            ? node.isShadow
              ? "rgba(20,184,166,0.25)"
              : "rgba(34,197,94,0.2)"
            : "rgba(255,255,255,0.04)";
        const cellBorder =
          isFocusCell && (highlight === "found" || node.isShadow)
            ? node.isShadow
              ? "#14b8a6"
              : "#22c55e"
            : "rgba(255,255,255,0.06)";

        return (
          <g key={cell.id}>
            <rect
              x={cx}
              y={cy}
              width={cellW - 2}
              height={cellH}
              rx={4}
              fill={cellFill}
              stroke={cellBorder}
              strokeWidth={0.5}
            />
            <text
              x={cx + (cellW - 2) / 2}
              y={cy + cellH / 2 - (cell.value ? 3 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={8}
              fontWeight={700}
              fontFamily="ui-monospace, monospace"
            >
              {cell.id}
            </text>
            {cell.value && (
              <text
                x={cx + (cellW - 2) / 2}
                y={cy + cellH / 2 + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={node.isShadow && cell.id === 42 ? "#14b8a6" : "rgba(255,255,255,0.4)"}
                fontSize={7}
                fontFamily="ui-monospace, monospace"
              >
                {cell.value}
              </text>
            )}
          </g>
        );
      })}
    </motion.g>
  );
}

function EdgeLine({
  from,
  to,
  active,
  allNodes,
  prefersReducedMotion,
}: {
  from: string;
  to: string;
  active: boolean;
  allNodes: PageNode[];
  prefersReducedMotion: boolean | null;
}) {
  const fromNode = allNodes.find((n) => n.id === from);
  const toNode = allNodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  const { cx: x1, cy: y1 } = nodeCenter(fromNode);
  const { cx: x2, cy: y2 } = nodeCenter(toNode);

  return (
    <motion.line
      x1={x1}
      y1={y1 + pageHeight(fromNode.type) / 2 - 4}
      x2={x2}
      y2={y2 - pageHeight(toNode.type) / 2 + 4}
      stroke={active ? "#14b8a6" : "rgba(255,255,255,0.08)"}
      strokeWidth={active ? 2 : 1}
      strokeDasharray={active ? "6 3" : "none"}
      initial={false}
      animate={{ opacity: active ? 1 : 0.4 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function BTreePageExplorer() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  const onStepChange = useCallback((s: number) => setStep(s), []);
  const vis = useMemo(() => getStepVis(step), [step]);

  // Combine original tree + shadow nodes
  const allNodes = useMemo(() => [...ORIGINAL_TREE, ...vis.shadows], [vis.shadows]);

  // Determine which edges to draw
  const activeEdgeSet = useMemo(
    () => new Set(vis.activeEdges.map(([a, b]) => `${a}-${b}`)),
    [vis.activeEdges],
  );

  // Combine original edges + shadow edges
  const allEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    const result: [string, string][] = [];
    for (const [a, b] of EDGES) {
      const key = `${a}-${b}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        result.push([a, b]);
      }
    }
    for (const [a, b] of vis.activeEdges) {
      const key = `${a}-${b}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        result.push([a, b]);
      }
    }
    return result;
  }, [vis.activeEdges]);

  // Phase label
  const phase = step <= 3 ? "Read Path" : "Write Path";

  return (
    <VizContainer
      title="B-Tree Page Explorer"
      description="Explore how data lives in 4KB B-tree pages and how copy-on-write enables MVCC."
      minHeight={480}
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Phase badge */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
              step <= 3
                ? "border-blue-500/30 bg-blue-500/5 text-blue-400"
                : "border-teal-500/30 bg-teal-500/5 text-teal-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${step <= 3 ? "bg-blue-400" : "bg-teal-400"}`}
            />
            {phase}
          </span>
        </div>

        {/* Banner */}
        <AnimatePresence>
          {vis.banner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
            >
              <code className="text-xs font-mono font-bold text-amber-300">{vis.banner}</code>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SVG tree visualization */}
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
            <svg
              viewBox="0 0 900 420"
              className="w-full h-auto min-w-[700px] md:min-w-full"
              style={{ maxHeight: 340 }}
            >
              {/* Edges */}
              {allEdges.map(([a, b]) => (
                <EdgeLine
                  key={`${a}-${b}`}
                  from={a}
                  to={b}
                  active={activeEdgeSet.has(`${a}-${b}`)}
                  allNodes={allNodes}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}

              {/* Page blocks */}
              {allNodes.map((node) => (
                <PageBlock
                  key={node.id}
                  node={node}
                  highlight={vis.highlighted[node.id] ?? "none"}
                  dimmed={vis.dimmedNodes.has(node.id)}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}

              {/* Depth labels */}
              <text
                x={8}
                y={(8 / 100) * 380 + 12}
                fill="rgba(255,255,255,0.15)"
                fontSize={8}
                fontWeight={700}
              >
                Depth 0
              </text>
              <text
                x={8}
                y={(35 / 100) * 380 + 12}
                fill="rgba(255,255,255,0.15)"
                fontSize={8}
                fontWeight={700}
              >
                Depth 1
              </text>
              <text
                x={8}
                y={(65 / 100) * 380 + 12}
                fill="rgba(255,255,255,0.15)"
                fontSize={8}
                fontWeight={700}
              >
                Depth 2
              </text>
            </svg>
          </div>
        </div>

        {/* Callout */}
        <AnimatePresence mode="wait">
          {vis.callout && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
              className="rounded-lg border border-white/10 bg-black/40 backdrop-blur-md px-5 py-3 text-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative z-10"
            >
              <span className="text-sm font-bold text-white drop-shadow-md">{vis.callout}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stepper */}
        <Stepper
          steps={STEPS}
          currentStep={step}
          onStepChange={onStepChange}
          autoPlayInterval={3000}
        />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a classic B-Tree. All data in FrankenSQLite (tables and indexes) is
              stored in these 4KB pages. The Root Page routes you to Internal Pages, which
              eventually route you to Leaf Pages holding the actual data.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              The interactive Stepper at the bottom walks you through a complete Read and Write
              cycle.
            </p>
            <p>
              During the <strong>Read Path</strong>, the engine performs a standard binary search
              down the tree to locate Alice.
            </p>
            <div>
              During the <strong>Write Path</strong>, we update Alice to Bob. Notice how the
              original Leaf 3 is never overwritten. Instead, the engine creates a{" "}
              <FrankenJargon term="cow">shadow copy</FrankenJargon>. This requires creating a shadow
              copy of its parent (Internal B&apos;) and a new Root&apos;.
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              The <FrankenJargon term="cow">Copy-on-Write</FrankenJargon> mechanism is what enables{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> at the{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> level. Because the old tree was
              never modified, existing readers can continue querying it simultaneously while the
              writer constructs the new tree in the background.
            </div>
            <p>
              No locks, no blocking. Once the write is finished, the new Root is atomically swapped
              in for all future transactions.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
