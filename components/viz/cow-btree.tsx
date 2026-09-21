"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// The tree will be 3 levels: Root (level 0), Internal (level 1), Leaf (level 2).
// A node is represented by its id and its children.

type NodeType = "root" | "internal" | "leaf";

interface TreeNode {
  id: string;
  type: NodeType;
  label: string;
  version: number;
  childrenIds: string[]; // references other nodes in the state map
  value?: number; // Only for leaves
}

interface TreeState {
  nodes: Record<string, TreeNode>;
  currentRoot: string;
  versionCount: number;
}

const INITIAL_NODES: Record<string, TreeNode> = {
  "root-v0": {
    id: "root-v0",
    type: "root",
    label: "Root",
    version: 0,
    childrenIds: ["int1-v0", "int2-v0"],
  },
  "int1-v0": {
    id: "int1-v0",
    type: "internal",
    label: "Node A",
    version: 0,
    childrenIds: ["leaf1-v0", "leaf2-v0"],
  },
  "int2-v0": {
    id: "int2-v0",
    type: "internal",
    label: "Node B",
    version: 0,
    childrenIds: ["leaf3-v0", "leaf4-v0"],
  },
  "leaf1-v0": {
    id: "leaf1-v0",
    type: "leaf",
    label: "Page 1",
    version: 0,
    childrenIds: [],
    value: 10,
  },
  "leaf2-v0": {
    id: "leaf2-v0",
    type: "leaf",
    label: "Page 2",
    version: 0,
    childrenIds: [],
    value: 25,
  },
  "leaf3-v0": {
    id: "leaf3-v0",
    type: "leaf",
    label: "Page 3",
    version: 0,
    childrenIds: [],
    value: 42,
  },
  "leaf4-v0": {
    id: "leaf4-v0",
    type: "leaf",
    label: "Page 4",
    version: 0,
    childrenIds: [],
    value: 88,
  },
};

function buildPathToRoot(
  targetLeafId: string,
  rootId: string,
  nodes: Record<string, TreeNode>,
): string[] {
  const path: string[] = [];

  function dfs(currentId: string): boolean {
    path.push(currentId);
    if (currentId === targetLeafId) return true;

    const node = nodes[currentId];
    if (node) {
      for (const childId of node.childrenIds) {
        if (dfs(childId)) return true;
      }
    }
    path.pop();
    return false;
  }

  dfs(rootId);
  return path;
}

export default function CowBtree() {
  const { playSfx } = useSite();
  const [treeState, setTreeState] = useState<TreeState>({
    nodes: INITIAL_NODES,
    currentRoot: "root-v0",
    versionCount: 0,
  });

  const [animatingPath, setAnimatingPath] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const reset = () => {
    clearPendingTimeouts();
    setTreeState({
      nodes: INITIAL_NODES,
      currentRoot: "root-v0",
      versionCount: 0,
    });
    setAnimatingPath([]);
    setIsAnimating(false);
  };

  const handleUpdateLeaf = useCallback(
    (leafId: string) => {
      if (isAnimating) return;
      setIsAnimating(true);

      const path = buildPathToRoot(leafId, treeState.currentRoot, treeState.nodes);
      setAnimatingPath(path);

      const newVersion = treeState.versionCount + 1;
      const nextNodes = { ...treeState.nodes };

      // We will build the new branch from bottom up.
      clearPendingTimeouts();
      const t1 = setTimeout(() => {
        // 1. Copy the leaf
        const oldLeaf = nextNodes[leafId];
        const newLeafId = `leaf${oldLeaf.label.split(" ")[1]}-v${newVersion}`;
        const newLeaf: TreeNode = {
          ...oldLeaf,
          id: newLeafId,
          version: newVersion,
          value: (oldLeaf.value || 0) + 1,
        };
        nextNodes[newLeafId] = newLeaf;

        setTreeState((prev) => ({ ...prev, nodes: nextNodes }));

        const t2 = setTimeout(() => {
          // 2. Copy the parent (internal node)
          const parentId = path[path.length - 2];
          const oldParent = nextNodes[parentId];
          const newParentId = `int${oldParent.label.split(" ")[1] === "A" ? 1 : 2}-v${newVersion}`;
          const newChildren = oldParent.childrenIds.map((cid) =>
            cid === leafId ? newLeafId : cid,
          );
          const newParent: TreeNode = {
            ...oldParent,
            id: newParentId,
            version: newVersion,
            childrenIds: newChildren,
          };
          nextNodes[newParentId] = newParent;

          setTreeState((prev) => ({ ...prev, nodes: nextNodes }));

          const t3 = setTimeout(() => {
            // 3. Copy the root
            const oldRoot = nextNodes[treeState.currentRoot];
            const newRootId = `root-v${newVersion}`;
            const newRootChildren = oldRoot.childrenIds.map((cid) =>
              cid === parentId ? newParentId : cid,
            );
            const newRoot: TreeNode = {
              ...oldRoot,
              id: newRootId,
              version: newVersion,
              childrenIds: newRootChildren,
            };
            nextNodes[newRootId] = newRoot;

            setTreeState({
              nodes: nextNodes,
              currentRoot: newRootId,
              versionCount: newVersion,
            });

            setAnimatingPath([]);
            setIsAnimating(false);
          }, 600);
          timeoutsRef.current.push(t3);
        }, 600);
        timeoutsRef.current.push(t2);
      }, 600);
      timeoutsRef.current.push(t1);
    },
    [treeState, isAnimating],
  );

  // Layout calculations
  // Fixed vertical positions for levels
  const levelY = { root: 20, internal: 100, leaf: 180 };

  // To draw properly, we need to gather all historical nodes and place them.
  // Active path gets bright colors. Ghost path (previous versions) gets dim colors.
  const allNodesList = Object.values(treeState.nodes);

  // Group by logical entity (Root, Node A, Node B, Page 1...)
  const getGroupX = (label: string, version: number) => {
    // base x positions
    const bases: Record<string, number> = {
      Root: 250,
      "Node A": 150,
      "Node B": 350,
      "Page 1": 100,
      "Page 2": 200,
      "Page 3": 300,
      "Page 4": 400,
    };
    // Offset slightly by version to show "stacking" history
    return (bases[label] || 250) + version * 15;
  };

  // We actually want ALL nodes reachable from current root
  const currentTreeIds = new Set<string>();
  const traverse = (id: string) => {
    currentTreeIds.add(id);
    treeState.nodes[id]?.childrenIds.forEach(traverse);
  };
  traverse(treeState.currentRoot);

  return (
    <VizContainer
      title="Copy-on-Write B-Tree"
      description="Click a leaf node (Page) to update its value. Notice how FrankenSQLite creates a new version of the leaf, its parent, and the root. The old root remains intact for concurrent readers."
      minHeight={400}
    >
      <div className="flex flex-col md:flex-row h-full">
        {/* Viz Area */}
        <div className="flex-1 relative min-h-[300px] overflow-hidden bg-[#050505] p-4 flex items-center justify-center">
          <div className="w-full overflow-x-auto touch-pan-x scrollbar-hide flex items-center justify-center h-full">
            <div className="relative w-[500px] md:w-full max-w-[500px] h-[260px] mx-auto shrink-0">
              {/* Draw Links */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                {allNodesList.map((node) => {
                  const isNodeActive = currentTreeIds.has(node.id);
                  const isNodeAnimating = animatingPath.includes(node.id);

                  return node.childrenIds.map((childId) => {
                    const child = treeState.nodes[childId];
                    if (!child) return null;

                    const startX = getGroupX(node.label, node.version);
                    const startY = levelY[node.type] + 30; // offset for node height
                    const endX = getGroupX(child.label, child.version);
                    const endY = levelY[child.type];

                    const isLinkActive = isNodeActive && currentTreeIds.has(child.id);

                    return (
                      <path
                        key={`${node.id}-${childId}`}
                        d={`M ${startX} ${startY} Q ${startX} ${(startY + endY) / 2}, ${endX} ${endY}`}
                        fill="none"
                        stroke={isLinkActive ? "#14b8a6" : "#334155"}
                        strokeWidth={isLinkActive ? 2 : 1}
                        opacity={isLinkActive ? 0.6 : 0.2}
                        strokeDasharray={isNodeAnimating ? "4 4" : "none"}
                      />
                    );
                  });
                })}
              </svg>

              {/* Draw Nodes */}
              <AnimatePresence>
                {allNodesList.map((node) => {
                  const isActive = currentTreeIds.has(node.id);
                  const isAnimatingNode = animatingPath.includes(node.id);
                  const isTarget = node.type === "leaf";

                  const x = getGroupX(node.label, node.version);
                  const y = levelY[node.type];

                  return (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: isActive ? 1 : 0.4,
                        scale: isAnimatingNode ? 1.1 : 1,
                        zIndex: isActive ? 10 : 1,
                      }}
                      className={`absolute flex flex-col items-center justify-center w-[80px] h-[30px] -ml-[40px] -mt-[15px] rounded-md border text-[10px] font-bold shadow-lg transition-colors ${isTarget && isActive ? "cursor-pointer" : "cursor-default"} select-none`}
                      style={{ left: x, top: y }}
                      onClick={() => {
                        if (isTarget && isActive && !isAnimating) {
                          playSfx("click");
                          handleUpdateLeaf(node.id);
                        }
                      }}
                      whileHover={
                        isTarget && isActive && !isAnimating
                          ? { scale: 1.05, borderColor: "#2dd4bf" }
                          : {}
                      }
                    >
                      <div
                        className={`absolute inset-0 rounded-md bg-black/80 backdrop-blur-sm -z-10 ${isActive ? "border-teal-500/50" : "border-slate-700/30"}`}
                      />

                      <span className={isActive ? "text-white" : "text-slate-500"}>
                        {node.label} <span className="opacity-50 font-mono">v{node.version}</span>
                      </span>

                      {node.value !== undefined && (
                        <div className="absolute -bottom-5 text-[9px] font-mono text-teal-400 bg-teal-950/40 px-1.5 rounded">
                          val: {node.value}
                        </div>
                      )}

                      {isAnimatingNode && (
                        <motion.div
                          className="absolute inset-0 rounded-md bg-teal-400/20"
                          animate={{ opacity: [0, 0.5, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-white/10 bg-black/40 p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-500 flex items-center gap-2">
              <GitBranch className="h-3 w-3" />
              Version History
            </div>

            <div className="text-xs text-slate-400 leading-relaxed font-medium">
              When a writer modifies a page, it doesn&apos;t overwrite it. It copies it, updates the
              value, and then propagates the copy operation up to the root.
            </div>

            <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-3">
              <div className="text-xs font-bold text-teal-400 mb-1">Current Readers</div>
              <div className="text-[10px] text-teal-200/70">
                Any queries that started before your edit are still safely reading from{" "}
                <strong className="text-white">
                  v{treeState.versionCount > 0 ? treeState.versionCount - 1 : 0}
                </strong>
                . They see a perfectly consistent snapshot.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playSfx("click");
              reset();
            }}
            className="mt-4 w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-white transition-all hover:bg-white/10 hover:border-teal-500/30 focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
          >
            Reset Tree
          </button>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a simplified model of the database&apos;s physical B-tree
              structure. The root node points to internal nodes, which point to the actual leaf
              pages holding your data on disk.
            </p>
            <p>
              In standard SQLite, if you want to modify &ldquo;Page 1&rdquo;, you must acquire an
              exclusive write lock on the entire database file, update the page in place, and block
              anyone else from reading or writing until you finish.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click on any of the bright-colored <strong>Leaf Pages</strong> at the bottom. Watch
              what happens.
            </p>
            <div>
              Instead of overwriting the page, the engine creates a brand new{" "}
              <FrankenJargon term="cow">shadow copy</FrankenJargon> (e.g., v1). It then has to
              create a new version of the parent node to point to the new leaf, all the way up to a
              new Root node.
            </div>
            <p>
              Notice how the faint, semi-transparent &ldquo;ghost&rdquo; of the old tree remains
              perfectly intact.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              This is the physical mechanism that makes{" "}
              <FrankenJargon term="mvcc">MVCC</FrankenJargon> possible. Because the old root (v0)
              was never modified, any long-running reporting queries that started before your edit
              can continue traversing the old <FrankenJargon term="btree">B-tree</FrankenJargon>{" "}
              without ever seeing your half-finished work.
            </div>
            <div>
              Writers do not block readers, and readers do not block writers. They operate on
              independent <FrankenJargon term="snapshot-isolation">snapshots</FrankenJargon> until
              the new <FrankenJargon term="cow">CoW</FrankenJargon> root is committed and atomically
              swapped in.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
