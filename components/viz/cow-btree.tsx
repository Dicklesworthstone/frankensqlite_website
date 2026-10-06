"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import { useSite } from "@/lib/site-state";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// The tree has 3 levels: Root (level 0), Internal (level 1), Leaf (level 2).
// Pages refer to their children by page number, so a page keeps its identity
// (its label here) across versions. A write creates a new *version* of the page
// it changes; the parent pages are not copied.

type NodeType = "root" | "internal" | "leaf";

interface PageDef {
  label: string;
  type: NodeType;
  /** Logical children (page labels), not specific versions. */
  children: string[];
  /** Base x position in the layout. */
  x: number;
}

interface PageVersion {
  version: number;
  value?: number; // Only for leaves
  /** Commit sequence number that published this version; null = still private to the writer. */
  commitSeq: number | null;
}

interface TreeState {
  versions: Record<string, PageVersion[]>;
  commitSeq: number;
  lastEdit: { label: string; version: number; commitSeq: number } | null;
}

const PAGES: Record<string, PageDef> = {
  Root: { label: "Root", type: "root", children: ["Node A", "Node B"], x: 250 },
  "Node A": { label: "Node A", type: "internal", children: ["Page 1", "Page 2"], x: 150 },
  "Node B": { label: "Node B", type: "internal", children: ["Page 3", "Page 4"], x: 350 },
  "Page 1": { label: "Page 1", type: "leaf", children: [], x: 100 },
  "Page 2": { label: "Page 2", type: "leaf", children: [], x: 200 },
  "Page 3": { label: "Page 3", type: "leaf", children: [], x: 300 },
  "Page 4": { label: "Page 4", type: "leaf", children: [], x: 400 },
};

const PARENT_OF: Record<string, string> = {
  "Page 1": "Node A",
  "Page 2": "Node A",
  "Page 3": "Node B",
  "Page 4": "Node B",
};

const INITIAL_VALUES: Record<string, number | undefined> = {
  "Page 1": 10,
  "Page 2": 25,
  "Page 3": 42,
  "Page 4": 88,
};

/** How many versions of a page this demo keeps on screen. */
const KEEP_VERSIONS = 3;

function initialState(): TreeState {
  const versions: Record<string, PageVersion[]> = {};
  for (const label of Object.keys(PAGES)) {
    versions[label] = [{ version: 0, value: INITIAL_VALUES[label], commitSeq: 0 }];
  }
  return { versions, commitSeq: 0, lastEdit: null };
}

export default function CowBtree() {
  const { playSfx } = useSite();
  const [treeState, setTreeState] = useState<TreeState>(initialState);

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
    setTreeState(initialState());
    setAnimatingPath([]);
    setIsAnimating(false);
  };

  const handleUpdateLeaf = useCallback(
    (leafLabel: string) => {
      if (isAnimating) return;
      setIsAnimating(true);

      // 1. Descend from the root to the leaf (read path).
      setAnimatingPath(["Root", PARENT_OF[leafLabel], leafLabel]);
      clearPendingTimeouts();

      const t1 = setTimeout(() => {
        // 2. The writer makes a private copy of the leaf with the new value.
        setTreeState((prev) => {
          const chain = prev.versions[leafLabel];
          const newest = chain[chain.length - 1];
          const draft: PageVersion = {
            version: newest.version + 1,
            value: (newest.value ?? 0) + 1,
            commitSeq: null,
          };
          return { ...prev, versions: { ...prev.versions, [leafLabel]: [...chain, draft] } };
        });
        setAnimatingPath([leafLabel]);

        const t2 = setTimeout(() => {
          // 3. Commit: the private version gets the next commit sequence number.
          setTreeState((prev) => {
            const seq = prev.commitSeq + 1;
            const chain = prev.versions[leafLabel].map((v) =>
              v.commitSeq === null ? { ...v, commitSeq: seq } : v,
            );
            const published = chain[chain.length - 1];
            return {
              versions: { ...prev.versions, [leafLabel]: chain.slice(-KEEP_VERSIONS) },
              commitSeq: seq,
              lastEdit: { label: leafLabel, version: published.version, commitSeq: seq },
            };
          });
          setAnimatingPath([]);
          setIsAnimating(false);
        }, 1100);
        timeoutsRef.current.push(t2);
      }, 700);
      timeoutsRef.current.push(t1);
    },
    [isAnimating],
  );

  // Layout calculations
  // Fixed vertical positions for levels
  const levelY = { root: 20, internal: 100, leaf: 180 };
  const versionX = (label: string, idx: number) => PAGES[label].x + idx * 15;

  const newestCommittedIdx = (label: string) => {
    const chain = treeState.versions[label];
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i].commitSeq !== null) return i;
    }
    return 0;
  };

  const lastEdit = treeState.lastEdit;

  return (
    <VizContainer
      title="Copy-on-Write Page Versions"
      description="Click a leaf page to update its value. FrankenSQLite does not overwrite the page. It writes a new version of the same page number, and readers with older snapshots keep seeing the old version."
      minHeight={400}
      status="live"
    >
      <div className="flex flex-col md:flex-row h-full">
        {/* Viz Area */}
        <div className="flex-1 relative min-h-[300px] overflow-hidden bg-[#050505] p-4 flex items-center justify-center">
          <div className="w-full overflow-x-auto touch-pan-x scrollbar-hide flex items-center justify-center h-full">
            <div className="relative w-[500px] md:w-full max-w-[500px] h-[260px] mx-auto shrink-0">
              {/* Draw Links: parent page -> every version of each child page */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                {Object.values(PAGES).map((parent) => {
                  const parentChain = treeState.versions[parent.label];
                  const parentIdx = parentChain.length - 1;
                  const startX = versionX(parent.label, parentIdx);
                  const startY = levelY[parent.type] + 15;
                  const parentAnimating = animatingPath.includes(parent.label);

                  return parent.children.flatMap((childLabel) => {
                    const child = PAGES[childLabel];
                    const chain = treeState.versions[childLabel];
                    const currentIdx = newestCommittedIdx(childLabel);
                    return chain.map((v, idx) => {
                      const endX = versionX(childLabel, idx);
                      const endY = levelY[child.type] - 15;
                      const isPrivate = v.commitSeq === null;
                      const isCurrent = idx === currentIdx;
                      const stroke = isPrivate ? "#f59e0b" : isCurrent ? "#14b8a6" : "#334155";
                      return (
                        <path
                          key={`${parent.label}-${childLabel}-v${v.version}`}
                          d={`M ${startX} ${startY} Q ${startX} ${(startY + endY) / 2}, ${endX} ${endY}`}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={isCurrent ? 2 : 1}
                          opacity={isPrivate ? 0.7 : isCurrent ? 0.6 : 0.25}
                          strokeDasharray={
                            isPrivate || (parentAnimating && isCurrent) ? "4 4" : "none"
                          }
                        />
                      );
                    });
                  });
                })}
              </svg>

              {/* Draw Nodes */}
              <AnimatePresence>
                {Object.values(PAGES).flatMap((page) => {
                  const chain = treeState.versions[page.label];
                  const currentIdx = newestCommittedIdx(page.label);
                  return chain.map((v, idx) => {
                    const isPrivate = v.commitSeq === null;
                    const isCurrent = idx === currentIdx;
                    const isNewest = idx === chain.length - 1;
                    const isAnimatingNode = isNewest && animatingPath.includes(page.label);
                    const isTarget = page.type === "leaf";
                    const clickable = isTarget && isNewest && !isPrivate && !isAnimating;

                    const x = versionX(page.label, idx);
                    const y = levelY[page.type];

                    return (
                      <motion.div
                        key={`${page.label}-v${v.version}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: isCurrent || isPrivate ? 1 : 0.4,
                          scale: isAnimatingNode ? 1.1 : 1,
                          zIndex: isNewest ? 10 : 1,
                        }}
                        className={`absolute flex flex-col items-center justify-center w-[80px] h-[30px] -ml-[40px] -mt-[15px] rounded-md border text-[10px] font-bold shadow-lg transition-colors ${clickable ? "cursor-pointer" : "cursor-default"} select-none ${isPrivate ? "border-dashed border-amber-400/70" : ""}`}
                        style={{ left: x, top: y }}
                        onClick={() => {
                          if (clickable) {
                            playSfx("click");
                            handleUpdateLeaf(page.label);
                          }
                        }}
                        whileHover={clickable ? { scale: 1.05, borderColor: "#2dd4bf" } : {}}
                      >
                        <div
                          className={`absolute inset-0 rounded-md bg-black/80 backdrop-blur-sm -z-10 ${isCurrent ? "border-teal-500/50" : "border-slate-700/30"}`}
                        />

                        <span
                          className={
                            isPrivate
                              ? "text-amber-300"
                              : isCurrent
                                ? "text-white"
                                : "text-slate-500"
                          }
                        >
                          {page.label} <span className="opacity-50 font-mono">v{v.version}</span>
                        </span>

                        {v.value !== undefined && isNewest && (
                          <div
                            className={`absolute -bottom-5 text-[9px] font-mono px-1.5 rounded whitespace-nowrap ${isPrivate ? "text-amber-300 bg-amber-950/40" : "text-teal-400 bg-teal-950/40"}`}
                          >
                            val: {v.value}
                            {isPrivate ? " (private)" : ""}
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
                  });
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
              A writer never overwrites a page. It writes a new version of the same page number,
              private until commit. Parent pages store page numbers, so an update like this one
              leaves them alone. (A split or merge changes the parent too, and then the parent gets
              a new version as well.)
            </div>

            <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-3">
              <div className="text-xs font-bold text-teal-400 mb-1">Current Readers</div>
              <div className="text-[10px] text-teal-200/70">
                {lastEdit ? (
                  <>
                    Snapshots taken before commit #{lastEdit.commitSeq} still read{" "}
                    <strong className="text-white">
                      {lastEdit.label} v{lastEdit.version - 1}
                    </strong>
                    . Snapshots taken after it read{" "}
                    <strong className="text-white">v{lastEdit.version}</strong>. Both see a
                    consistent database.
                  </>
                ) : (
                  <>Every page is at v0. Click a leaf page to start a write.</>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed">
              Old versions are reclaimed once no open snapshot can see them. This demo keeps the
              last {KEEP_VERSIONS}.
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
              A simplified B-tree: one root page, two interior pages, and four leaf pages that hold
              the rows. Each box is a page. Boxes stacked on top of each other are versions of the
              same page.
            </p>
            <p>
              In standard SQLite, changing &ldquo;Page 1&rdquo; means taking the database&apos;s
              single write lock. In WAL mode, readers keep reading the last committed state while
              that writer works, but no second writer can start until the first one commits. (In
              rollback-journal mode, readers are also locked out while the commit is written.)
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click any bright <strong>Leaf Page</strong> at the bottom. The highlighted path is
              the descent from the root to that leaf.
            </p>
            <div>
              The engine does not overwrite the leaf. It makes a{" "}
              <FrankenJargon term="cow">copy</FrankenJargon> with the new value (amber, dashed)
              that only this writer can see. On commit, that copy gets the next commit sequence
              number and becomes the newest version of the page.
            </div>
            <p>
              Notice that Node A, Node B, and the Root stay at v0. They point to the leaf by page
              number, and each reader&apos;s snapshot decides which version of that page it gets.
            </p>
          </>
        }
        whyItMatters={
          <>
            <div>
              This is <FrankenJargon term="mvcc">MVCC</FrankenJargon> at the page level. A
              long-running query keeps reading the page versions that match its{" "}
              <FrankenJargon term="snapshot-isolation">snapshot</FrankenJargon>, so it never sees
              half of someone else&apos;s write. Readers do not take page locks.
            </div>
            <div>
              It also lets a second writer create versions of a different{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> page at the same time. Two writers
              that change the same page still conflict: the second one to commit gets{" "}
              <code>SQLITE_BUSY_SNAPSHOT</code> and has to retry.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
