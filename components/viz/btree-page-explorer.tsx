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
  /** Whether this is a new version of a page (copy-on-write) */
  isShadow?: boolean;
  /** Whether that new version is still private to the writer (not yet committed) */
  isPrivate?: boolean;
}

type HighlightState = "none" | "active" | "scanning" | "found" | "cow" | "updated";

/* ------------------------------------------------------------------ */
/*  Tree data                                                          */
/* ------------------------------------------------------------------ */

// Interior pages follow SQLite's table B-tree rule: each interior cell holds a
// key and a left-child page number (rowids <= key live in that child); the
// page header holds one more "right-most" child pointer for larger rowids.
const ORIGINAL_TREE: PageNode[] = [
  {
    id: "root",
    label: "Root Page",
    type: "root",
    cells: [{ id: 30, value: "" }],
    x: 50,
    y: 8,
  },
  {
    id: "int-left",
    label: "Internal A",
    type: "internal",
    cells: [{ id: 12, value: "" }],
    x: 25,
    y: 35,
  },
  {
    id: "int-right",
    label: "Internal B",
    type: "internal",
    cells: [{ id: 42, value: "" }],
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
    label: "Leaf 3 v1",
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
      "Rows live in fixed-size B-tree pages: 4096 bytes by default, and SQLite allows any power of two from 512 to 65536. Interior pages hold keys and child page numbers; leaf pages hold the rows. This is SQLite's own file format, which FrankenSQLite reads and writes unchanged.",
  },
  {
    label: "Search the root",
    description:
      "Looking for rowid 42. The root has one key, 30: rowids up to 30 live under its left child. 42 is larger, so follow the right-most child pointer.",
  },
  {
    label: "Follow pointer to interior page",
    description:
      "Internal B has one key, 42. Since 42 ≤ 42, follow that cell's left child pointer to Leaf 3.",
  },
  {
    label: "Leaf found: rowid 42",
    description: "Leaf 3 holds rowid 42, name='Alice'. The read touched 3 pages.",
  },
  {
    label: "UPDATE arrives",
    description: "UPDATE users SET name='Bob' WHERE id=42. The write path begins.",
  },
  {
    label: "Copy-on-write",
    description:
      "The committed Leaf 3 is not overwritten. The writer gets a private copy of the page (same page number, new version) and changes the cell there. Everyone else keeps reading the committed version.",
  },
  {
    label: "Parents stay the same",
    description:
      "Internal B and the root still hold Leaf 3's page number, so nothing above the leaf is copied. Each reader's snapshot decides which version of that page it gets. (A split or merge would change the parent too, and then the parent would get a new version as well.)",
  },
  {
    label: "Commit publishes the version",
    description:
      "At commit the new version gets the next commit sequence number. Snapshots taken after that see 'Bob'; snapshots taken before it keep seeing 'Alice' until they finish, and then the old version can be reclaimed. A writer on another leaf is unaffected; one that also changed Leaf 3 would get SQLITE_BUSY_SNAPSHOT and retry.",
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
      base.callout = "Header  |  Cell Pointers  |  Free Space  |  Cells";
      return base;

    case 1:
      // Root scanning
      base.highlighted = { root: "scanning" };
      base.callout = "42 > 30 → follow the right-most child";
      return base;

    case 2:
      // Traversal arrow root → int-right
      base.highlighted = { root: "active", "int-right": "scanning" };
      base.activeEdges = [["root", "int-right"]];
      base.callout = "42 ≤ 42 → follow the left child to Leaf 3";
      return base;

    case 3:
      // Leaf found
      base.highlighted = { root: "active", "int-right": "active", "leaf-3": "found" };
      base.activeEdges = [
        ["root", "int-right"],
        ["int-right", "leaf-3"],
      ];
      base.callout = "rowid=42, name='Alice'. Found!";
      return base;

    case 4:
      // UPDATE banner
      base.highlighted = { "leaf-3": "active" };
      base.banner = "UPDATE users SET name='Bob' WHERE id=42";
      return base;

    case 5:
      // CoW: private new version of the leaf
      base.highlighted = { "leaf-3": "none" };
      base.dimmedNodes = new Set(["leaf-3"]);
      base.shadows = [leaf3Version(true)];
      base.callout = "Private copy of Leaf 3 created; the committed version is untouched";
      return base;

    case 6:
      // Parents are not copied: they refer to Leaf 3 by page number
      base.highlighted = { root: "active", "int-right": "active" };
      base.dimmedNodes = new Set(["leaf-3"]);
      base.shadows = [leaf3Version(true)];
      base.activeEdges = [
        ["root", "int-right"],
        ["int-right", "leaf-3-cow"],
      ];
      base.callout = "Internal B → Leaf 3's page number → the version this snapshot can see";
      return base;

    case 7:
      // Commit: the new version is published; the old one stays for older snapshots
      base.dimmedNodes = new Set(["leaf-3"]);
      base.shadows = [leaf3Version(false)];
      base.activeEdges = [
        ["root", "int-right"],
        ["int-right", "leaf-3-cow"],
      ];
      base.callout = "New snapshots see 'Bob'. Older snapshots still see 'Alice'.";
      return base;
  }
  return base;
}

/** The writer's new version of Leaf 3 (same page number, new version). */
function leaf3Version(isPrivate: boolean): PageNode {
  return {
    id: "leaf-3-cow",
    label: isPrivate ? "Leaf 3 v2 (private)" : "Leaf 3 v2 (committed)",
    type: "leaf",
    cells: [
      { id: 37, value: "Frank" },
      { id: 42, value: "Bob" },
    ],
    x: 68,
    y: 65,
    isShadow: true,
    isPrivate,
  };
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

  const shadowColor = node.isPrivate ? "#f59e0b" : "#14b8a6";

  const glowColor = node.isShadow
    ? node.isPrivate
      ? "rgba(245,158,11,0.5)"
      : "rgba(20,184,166,0.5)"
    : highlight === "found"
      ? "rgba(34,197,94,0.5)"
      : highlight === "scanning"
        ? "rgba(250,204,21,0.4)"
        : highlight === "active"
          ? "rgba(56,189,248,0.3)"
          : "transparent";

  const borderColor = node.isShadow
    ? shadowColor
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
        fill={
          node.isShadow
            ? node.isPrivate
              ? "rgba(245,158,11,0.08)"
              : "rgba(20,184,166,0.08)"
            : "rgba(255,255,255,0.03)"
        }
        stroke={borderColor}
        strokeWidth={1.5}
      />

      {/* Label */}
      <text
        x={x + PAGE_W / 2}
        y={y + 14}
        textAnchor="middle"
        fill={node.isShadow ? shadowColor : "#94a3b8"}
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
              ? node.isPrivate
                ? "rgba(245,158,11,0.25)"
                : "rgba(20,184,166,0.25)"
              : "rgba(34,197,94,0.2)"
            : "rgba(255,255,255,0.04)";
        const cellBorder =
          isFocusCell && (highlight === "found" || node.isShadow)
            ? node.isShadow
              ? shadowColor
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
                fill={node.isShadow && cell.id === 42 ? shadowColor : "rgba(255,255,255,0.4)"}
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
      description="Explore how rows live in SQLite-format B-tree pages (4 KB by default) and how writing a new page version, instead of overwriting the page, gives readers a stable snapshot."
      minHeight={480}
      status="live"
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
              A small table B-tree in SQLite&apos;s on-disk format, which FrankenSQLite reads and
              writes unchanged. Tables and indexes are both stored this way. Pages are 4096 bytes by
              default (SQLite allows 512 to 65536). The root page routes you to interior pages,
              which route you to the leaf pages that hold the rows.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              The stepper at the bottom walks through one read and one write.
            </p>
            <p>
              On the <strong>Read Path</strong>, the engine compares the rowid against each
              page&apos;s keys to pick the next child, three page reads in all, to find Alice.
            </p>
            <div>
              On the <strong>Write Path</strong>, we change Alice to Bob. The committed Leaf 3 is
              not overwritten. The writer gets a private{" "}
              <FrankenJargon term="cow">copy</FrankenJargon>, which is a new version of the same
              page number. Internal B and the root are not copied, because they refer to Leaf 3 by
              page number.
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              Because committed pages are never overwritten in place, readers that started earlier
              keep reading the old version while the writer works, without taking page locks. The
              writer&apos;s change becomes visible all at once when it commits. This is how{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> works at the{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> page level.
            </div>
            <p>
              Writers still coordinate. A page has at most one writer at a time (a second writer
              that tries to lock it gets <code>SQLITE_BUSY</code> right away), commit has a short
              serialized step, and two transactions that changed the same page cannot both commit:
              the later one gets <code>SQLITE_BUSY_SNAPSHOT</code> and retries.
            </p>
          </>
        }
      />
    </VizContainer>
  );
}
