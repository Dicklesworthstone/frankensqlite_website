"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Store } from "@tanstack/store";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
  Menu,
  Minimize2,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { BUCKETS, DB_FILENAME } from "./constants";
import { applySynapticPatch, stripMd } from "./patch-engine";
import type { Commit, DiffMode, MetricsEntry, Tab } from "./types";
import "./viewer.css";

// ---------------------------------------------------------------------------
// Database & Caches (module-level, outside React lifecycle)
// ---------------------------------------------------------------------------

type SqlJsDatabase = {
  exec: (sql: string, params?: unknown[]) => { values: unknown[][] }[];
  close: () => void;
};

type ViewerBootstrap = {
  db: SqlJsDatabase;
  baseDoc: string;
  commits: Commit[];
  groups: Map<string, number[]>;
  startIdx: number;
};

type EChartsLike = {
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: () => void;
  dispose: () => void;
};

type EvolutionMapSegment = {
  bucketId: number;
  ratio: number;
};

type CommitSortMode = "latest" | "oldest" | "impact" | "author";

type ViewerState = {
  currentIdx: number;
  tab: Tab;
  query: string;
  activeBuckets: Set<number>;
  playing: boolean;
  diffMode: DiffMode;
  focusMode: boolean;
  sidebarOpen: boolean;
  legendOpen: boolean;
  specHtml: string;
  diffHtml: string;
  metrics: MetricsEntry[];
  specLineCount: number;
  sortMode: CommitSortMode;
};

const EMPTY_COMMITS: Commit[] = [];
const EMPTY_GROUPS = new Map<string, number[]>();
const COMMIT_COLUMNS: ColumnDef<Commit>[] = [
  { accessorKey: "idx" },
  { accessorKey: "date" },
  { accessorKey: "impact" },
  { accessorKey: "author" },
  { accessorKey: "subject" },
  { accessorKey: "hash" },
  { accessorKey: "short" },
];

const QUERY_KEYS = {
  bootstrap: ["spec-evolution", "bootstrap"] as const,
  metrics: ["spec-evolution", "metrics"] as const,
  snapshot: (idx: number) => ["spec-evolution", "snapshot", idx] as const,
  patch: (idx: number) => ["spec-evolution", "patch", idx] as const,
};

let dbInstance: SqlJsDatabase | null = null;
const docCache = new Map<number, string>();
const patchCache = new Map<number, string>();
const specHtmlCache = new Map<number, string>();
const diffHtmlCache = new Map<string, string>();
const specLineCountCache = new Map<number, number>();
const addedPatchLinesCache = new Map<number, Set<string>>();
let markedModulePromise: Promise<typeof import("marked")> | null = null;
let domPurifyModulePromise: Promise<typeof import("dompurify")> | null = null;
let diff2htmlModulePromise: Promise<typeof import("diff2html")> | null = null;
let diff2htmlTypesModulePromise: Promise<typeof import("diff2html/lib/types")> | null = null;

function getMarkedModule() {
  markedModulePromise ??= import("marked");
  return markedModulePromise;
}

function getDomPurifyModule() {
  domPurifyModulePromise ??= import("dompurify");
  return domPurifyModulePromise;
}

function getDiff2HtmlModule() {
  diff2htmlModulePromise ??= import("diff2html");
  return diff2htmlModulePromise;
}

function getDiff2HtmlTypesModule() {
  diff2htmlTypesModulePromise ??= import("diff2html/lib/types");
  return diff2htmlTypesModulePromise;
}

async function loadDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.14.0/dist/${file}`,
  });

  const resp = await fetch(`/${DB_FILENAME}`);
  if (!resp.ok) throw new Error(`Failed to fetch database: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);

  const magic = new TextDecoder().decode(bytes.slice(0, 15));
  if (magic !== "SQLite format 3") {
    throw new Error(`Not a SQLite database (magic: "${magic}")`);
  }

  dbInstance = new SQL.Database(bytes) as unknown as SqlJsDatabase;
  return dbInstance;
}

function loadCommitsFromDb(db: SqlJsDatabase): Commit[] {
  const res = db.exec(
    "SELECT idx, hash, short, date_iso, author, subject, add_lines, del_lines, impact, primary_bucket, labels_json FROM commits ORDER BY idx ASC",
  );
  if (!res.length) return [];
  return res[0].values.map((r) => ({
    idx: r[0] as number,
    hash: r[1] as string,
    short: r[2] as string,
    date: r[3] as string,
    author: r[4] as string,
    subject: r[5] as string,
    searchText:
      `${r[5] as string} ${r[1] as string} ${r[2] as string} ${r[4] as string}`.toLowerCase(),
    add: r[6] as number,
    del: r[7] as number,
    impact: r[8] as number,
    primary: r[9] as number,
    labels: parseJsonNumberArray(r[10]),
  }));
}

function loadGroupsFromDb(db: SqlJsDatabase): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  const res = db.exec("SELECT commit_hash, labels_json FROM change_groups");
  if (!res.length) return groups;
  for (const r of res[0].values) {
    const hash = r[0] as string;
    const labels = parseJsonNumberArray(r[1]);
    if (!groups.has(hash)) groups.set(hash, []);
    groups.get(hash)!.push(...labels);
  }
  return groups;
}

function getInitialCommitIndex(totalCommits: number): number {
  if (totalCommits <= 0) return 0;

  let startIdx = totalCommits - 1;
  if (typeof window === "undefined") return startIdx;

  const hash = window.location.hash;
  if (hash.startsWith("#entry-")) {
    const requested = parseInt(hash.replace("#entry-", ""), 10);
    if (!Number.isNaN(requested) && requested >= 0 && requested < totalCommits) {
      startIdx = requested;
    }
  }

  return startIdx;
}

function createInitialViewerState(): ViewerState {
  return {
    currentIdx: 0,
    tab: "spec",
    query: "",
    activeBuckets: new Set<number>(),
    playing: false,
    diffMode: "line-by-line",
    focusMode: false,
    sidebarOpen: false,
    legendOpen: false,
    specHtml: "",
    diffHtml: "",
    metrics: [],
    specLineCount: 0,
    sortMode: "latest",
  };
}

function parseJsonNumberArray(value: unknown): number[] {
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is number => typeof entry === "number");
  } catch {
    return [];
  }
}

function sortingForMode(mode: CommitSortMode): SortingState {
  switch (mode) {
    case "oldest":
      return [{ id: "idx", desc: false }];
    case "impact":
      return [
        { id: "impact", desc: true },
        { id: "idx", desc: true },
      ];
    case "author":
      return [
        { id: "author", desc: false },
        { id: "idx", desc: true },
      ];
    case "latest":
    default:
      return [{ id: "idx", desc: true }];
  }
}

function bucketById(id: number) {
  return BUCKETS.find((b) => b.id === id) || BUCKETS[9];
}

async function loadViewerBootstrap(): Promise<ViewerBootstrap> {
  const db = await loadDatabase();

  const baseRes = db.exec("SELECT text FROM base_doc LIMIT 1");
  const baseDoc = baseRes.length ? (baseRes[0].values[0][0] as string) : "";

  const commits = loadCommitsFromDb(db);
  const groups = loadGroupsFromDb(db);
  const startIdx = getInitialCommitIndex(commits.length);

  return {
    db,
    baseDoc,
    commits,
    groups,
    startIdx,
  };
}

async function getPatch(db: SqlJsDatabase, idx: number): Promise<string> {
  if (patchCache.has(idx)) return patchCache.get(idx)!;
  const res = db.exec("SELECT patch FROM patches WHERE idx = ?", [idx]);
  const p = res.length ? (res[0].values[0][0] as string) : "";
  patchCache.set(idx, p);
  return p;
}

function getSpecLineCount(idx: number, text: string): number {
  const cached = specLineCountCache.get(idx);
  if (cached !== undefined) return cached;

  const count = text.split("\n").length;
  specLineCountCache.set(idx, count);
  return count;
}

function getAddedPatchLines(idx: number, patch: string): Set<string> {
  const cached = addedPatchLinesCache.get(idx);
  if (cached) return cached;

  const addedLines = new Set<string>();
  for (const line of patch.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const content = stripMd(line.slice(1));
    if (content.length > 6) addedLines.add(content);
  }

  addedPatchLinesCache.set(idx, addedLines);
  return addedLines;
}

function getAllPatches(db: SqlJsDatabase): Map<number, string> {
  const allPatches = new Map<number, string>();
  const res = db.exec("SELECT idx, patch FROM patches ORDER BY idx ASC");
  if (!res.length) return allPatches;

  for (const row of res[0].values) {
    const idx = row[0] as number;
    const patch = (row[1] as string) || "";
    allPatches.set(idx, patch);
    if (!patchCache.has(idx)) patchCache.set(idx, patch);
  }
  return allPatches;
}

async function reconstructSnapshot(
  db: SqlJsDatabase,
  idx: number,
  baseDoc: string,
): Promise<string> {
  if (docCache.has(idx)) return docCache.get(idx)!;

  let startIdx = 0;
  let lines = baseDoc.split("\n");
  for (let i = Math.floor(idx / 10) * 10; i >= 0; i -= 10) {
    if (docCache.has(i)) {
      startIdx = i + 1;
      lines = docCache.get(i)!.split("\n");
      break;
    }
  }

  for (let i = startIdx; i <= idx; i++) {
    const p = await getPatch(db, i);
    if (p) lines = applySynapticPatch(lines, p);
    if (i % 10 === 0 && !docCache.has(i)) docCache.set(i, lines.join("\n"));
  }

  const result = lines.join("\n");
  docCache.set(idx, result);
  return result;
}

async function computeAllMetrics(
  db: SqlJsDatabase,
  commits: Commit[],
  baseDoc: string,
): Promise<MetricsEntry[]> {
  const metrics: MetricsEntry[] = [];
  const allPatches = getAllPatches(db);
  let lines = baseDoc.split("\n");
  for (let i = 0; i < commits.length; i++) {
    const p = allPatches.get(i) ?? "";
    if (p) lines = applySynapticPatch(lines, p);
    const text = lines.join("\n");
    const tokens = text.split(/\s+/).length;
    metrics.push({ lines: lines.length, tokens, lev: commits[i].impact || 0 });
    if (i % 10 === 0) docCache.set(i, text);
  }
  return metrics;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
}

function enhanceTables(root: HTMLElement) {
  root.querySelectorAll("table").forEach((table) => {
    const headers = Array.from(table.querySelectorAll("th")).map(
      (th) => th.textContent?.trim() ?? "",
    );
    table.querySelectorAll("tr").forEach((tr) => {
      tr.querySelectorAll("td").forEach((td, i) => {
        if (headers[i]) td.setAttribute("data-label", headers[i]);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Viewer Component
// ---------------------------------------------------------------------------

function SpecEvolutionViewerInner() {
  const viewerStoreRef = useRef<Store<ViewerState> | null>(null);
  if (!viewerStoreRef.current) {
    viewerStoreRef.current = new Store(createInitialViewerState());
  }
  const viewerStore = viewerStoreRef.current;

  const currentIdx = useStore(viewerStore, (s) => s.currentIdx);
  const tab = useStore(viewerStore, (s) => s.tab);
  const query = useStore(viewerStore, (s) => s.query);
  const activeBuckets = useStore(viewerStore, (s) => s.activeBuckets);
  const playing = useStore(viewerStore, (s) => s.playing);
  const diffMode = useStore(viewerStore, (s) => s.diffMode);
  const focusMode = useStore(viewerStore, (s) => s.focusMode);
  const sidebarOpen = useStore(viewerStore, (s) => s.sidebarOpen);
  const legendOpen = useStore(viewerStore, (s) => s.legendOpen);
  const specHtml = useStore(viewerStore, (s) => s.specHtml);
  const diffHtml = useStore(viewerStore, (s) => s.diffHtml);
  const metrics = useStore(viewerStore, (s) => s.metrics);
  const specLineCount = useStore(viewerStore, (s) => s.specLineCount);
  const sortMode = useStore(viewerStore, (s) => s.sortMode);

  // Refs
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const commitListRef = useRef<HTMLDivElement>(null);
  const chartVelocityRef = useRef<HTMLDivElement>(null);
  const chartDistRef = useRef<HTMLDivElement>(null);
  const chartMassRef = useRef<HTMLDivElement>(null);
  const specContentRef = useRef<HTMLDivElement>(null);
  const initSelectionRef = useRef(false);
  const echartsRef = useRef<{
    velocity: EChartsLike | null;
    dist: EChartsLike | null;
    mass: EChartsLike | null;
  }>({ velocity: null, dist: null, mass: null });
  const mapBackgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawEvolutionMapRef = useRef<() => void>(() => {});
  const resizeRafRef = useRef<number | null>(null);
  const currentIdxRef = useRef(currentIdx);
  const renderNonceRef = useRef(0);

  const queryClient = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: QUERY_KEYS.bootstrap,
    queryFn: loadViewerBootstrap,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const commits = bootstrapQuery.data?.commits ?? EMPTY_COMMITS;
  const groups = bootstrapQuery.data?.groups ?? EMPTY_GROUPS;
  const db = bootstrapQuery.data?.db ?? null;
  const baseDoc = bootstrapQuery.data?.baseDoc ?? "";

  const velocityChartData = useMemo(
    () => commits.map((commit) => [commit.date, commit.impact] as [string, number]),
    [commits],
  );

  const distributionChartData = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const commit of commits) {
      counts[commit.primary] = (counts[commit.primary] || 0) + 1;
    }

    return BUCKETS.map((bucket) => ({
      value: counts[bucket.id] || 0,
      name: bucket.name,
      itemStyle: { color: bucket.color },
    }));
  }, [commits]);

  const massChartData = useMemo(() => {
    const bucketsByDay: Record<string, Record<number, number>> = {};
    for (const commit of commits) {
      const dayKey = dayjs(commit.date).format("YYYY-MM-DD");
      if (!bucketsByDay[dayKey]) bucketsByDay[dayKey] = {};
      bucketsByDay[dayKey][commit.primary] =
        (bucketsByDay[dayKey][commit.primary] || 0) + commit.impact;
    }

    const labels = Object.keys(bucketsByDay).sort();
    const series = BUCKETS.map((bucket) => ({
      name: bucket.name,
      type: "bar" as const,
      stack: "total",
      itemStyle: { color: bucket.color },
      data: labels.map((label) => bucketsByDay[label][bucket.id] || 0),
    }));

    return { labels, series };
  }, [commits]);

  const bucketColorById = useMemo(() => {
    const colors = new Map<number, string>();
    for (const bucket of BUCKETS) colors.set(bucket.id, bucket.color);
    return colors;
  }, []);

  const evolutionMapStacks = useMemo<EvolutionMapSegment[][]>(
    () =>
      commits.map((commit) => {
        const labels = groups.get(commit.hash) || commit.labels;
        const bucketIds = labels.length ? labels : [10];
        const counts: Record<number, number> = {};

        for (const label of bucketIds) {
          counts[label] = (counts[label] || 0) + 1;
        }

        const orderedBucketIds = Object.keys(counts).map((key) => Number(key));
        const total = bucketIds.length || 1;
        return orderedBucketIds.map((bucketId) => ({
          bucketId,
          ratio: counts[bucketId] / total,
        }));
      }),
    [commits, groups],
  );

  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);

  useEffect(() => {
    if (!bootstrapQuery.data || initSelectionRef.current) return;
    initSelectionRef.current = true;
    viewerStore.setState((state) => ({
      ...state,
      currentIdx: bootstrapQuery.data.startIdx,
    }));
  }, [bootstrapQuery.data, viewerStore]);

  useEffect(() => {
    if (commits.length === 0) return;
    if (currentIdx < commits.length) return;

    const fallbackIdx = commits.length - 1;
    viewerStore.setState((state) => ({
      ...state,
      currentIdx: fallbackIdx,
    }));
    history.replaceState(null, "", `#entry-${fallbackIdx}`);
  }, [commits.length, currentIdx, viewerStore]);

  const metricsQuery = useQuery({
    queryKey: QUERY_KEYS.metrics,
    queryFn: () => computeAllMetrics(db!, commits, baseDoc),
    enabled: Boolean(db && commits.length > 0 && tab === "timeline"),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (!metricsQuery.data) return;
    viewerStore.setState((state) => ({
      ...state,
      metrics: metricsQuery.data,
    }));
  }, [metricsQuery.data, viewerStore]);

  const snapshotQuery = useQuery({
    queryKey: QUERY_KEYS.snapshot(currentIdx),
    queryFn: () => reconstructSnapshot(db!, currentIdx, baseDoc),
    enabled: Boolean(db && commits.length > 0 && tab === "spec"),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const patchQuery = useQuery({
    queryKey: QUERY_KEYS.patch(currentIdx),
    queryFn: () => getPatch(db!, currentIdx),
    enabled: Boolean(db && commits.length > 0 && (tab === "spec" || tab === "diff")),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (!db || commits.length === 0) return;

    const neighborIdxs = [currentIdx - 1, currentIdx + 1].filter(
      (idx) => idx >= 0 && idx < commits.length,
    );

    neighborIdxs.forEach((idx) => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.patch(idx),
        queryFn: () => getPatch(db, idx),
        staleTime: Infinity,
        gcTime: Infinity,
      });
    });

    const nextIdx = currentIdx + 1;
    if (nextIdx < 0 || nextIdx >= commits.length) return;

    let cleanup: (() => void) | undefined;
    const prefetchSnapshot = () => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.snapshot(nextIdx),
        queryFn: () => reconstructSnapshot(db, nextIdx, baseDoc),
        staleTime: Infinity,
        gcTime: Infinity,
      });
    };

    const requestIdle = (
      window as Window &
        typeof globalThis & {
          requestIdleCallback?: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions,
          ) => number;
          cancelIdleCallback?: (handle: number) => void;
        }
    ).requestIdleCallback;
    const cancelIdle = (
      window as Window &
        typeof globalThis & {
          cancelIdleCallback?: (handle: number) => void;
        }
    ).cancelIdleCallback;

    if (typeof requestIdle === "function" && typeof cancelIdle === "function") {
      const idleId = requestIdle(prefetchSnapshot, {
        timeout: 1200,
      });
      cleanup = () => cancelIdle(idleId);
    } else {
      const timeoutId = window.setTimeout(prefetchSnapshot, 200);
      cleanup = () => window.clearTimeout(timeoutId);
    }

    return cleanup;
  }, [queryClient, db, baseDoc, commits.length, currentIdx]);

  // ── TanStack Table: bucket filtering + search + sorting ──────────────
  const bucketFilteredCommits = useMemo(() => {
    if (activeBuckets.size === 0) return commits;
    return commits.filter((c) => activeBuckets.has(c.primary));
  }, [commits, activeBuckets]);

  const tableSorting = useMemo(() => sortingForMode(sortMode), [sortMode]);

  const commitTable = useReactTable({
    data: bucketFilteredCommits,
    columns: COMMIT_COLUMNS,
    state: {
      sorting: tableSorting,
      globalFilter: query,
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "")
        .trim()
        .toLowerCase();
      if (!q) return true;

      const commit = row.original;
      return commit.searchText.includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredRows = commitTable.getRowModel().rows;
  const filtered = useMemo(() => filteredRows.map((row) => row.original), [filteredRows]);
  const filteredIndexByCommitIdx = useMemo(() => {
    const indexMap = new Map<number, number>();
    filtered.forEach((commit, idx) => {
      indexMap.set(commit.idx, idx);
    });
    return indexMap;
  }, [filtered]);

  // Direct prev/next lookup maps for O(1) filtered navigation
  const prevByCommitIdx = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 1; i < filtered.length; i++) {
      map.set(filtered[i].idx, filtered[i - 1].idx);
    }
    return map;
  }, [filtered]);

  const nextByCommitIdx = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < filtered.length - 1; i++) {
      map.set(filtered[i].idx, filtered[i + 1].idx);
    }
    return map;
  }, [filtered]);

  const firstFilteredIdx = useMemo(() => filtered[0]?.idx, [filtered]);

  const currentCommit = commits[currentIdx] ?? null;

  // ── TanStack Virtual: sidebar list ────────────────────────────────────
  const commitVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => commitListRef.current,
    estimateSize: () => 96,
    overscan: 10,
  });

  const selectedFilteredIdx = useMemo(
    () => filteredIndexByCommitIdx.get(currentIdx) ?? -1,
    [filteredIndexByCommitIdx, currentIdx],
  );

  useEffect(() => {
    if (selectedFilteredIdx < 0) return;
    commitVirtualizer.scrollToIndex(selectedFilteredIdx, {
      align: "center",
      behavior: "smooth",
    });
  }, [selectedFilteredIdx, commitVirtualizer]);

  // ── Render spec content when currentIdx or tab changes ──────────────
  useEffect(() => {
    if (tab !== "spec") return;
    if (typeof snapshotQuery.data !== "string") return;

    const text = snapshotQuery.data;
    const nonce = ++renderNonceRef.current;
    const lineCount = getSpecLineCount(currentIdx, text);

    const cachedSpecHtml = specHtmlCache.get(currentIdx);
    if (cachedSpecHtml !== undefined) {
      viewerStore.setState((state) => {
        if (state.specLineCount === lineCount && state.specHtml === cachedSpecHtml) {
          return state;
        }

        return {
          ...state,
          specLineCount: lineCount,
          specHtml: cachedSpecHtml,
        };
      });
      return;
    }

    viewerStore.setState((state) => {
      if (state.specLineCount === lineCount) return state;
      return {
        ...state,
        specLineCount: lineCount,
      };
    });

    async function render() {
      try {
        const [{ marked }, domPurify] = await Promise.all([
          getMarkedModule(),
          getDomPurifyModule(),
        ]);
        const DOMPurify = domPurify.default;
        if (nonce !== renderNonceRef.current) return;

        const html = DOMPurify.sanitize(await marked.parse(text));
        specHtmlCache.set(currentIdx, html);
        viewerStore.setState((state) => {
          if (state.specHtml === html) return state;
          return {
            ...state,
            specHtml: html,
          };
        });
      } catch {
        const fallbackHtml = `<pre class="spec-fallback-pre">${escapeHtml(text)}</pre>`;
        specHtmlCache.set(currentIdx, fallbackHtml);
        viewerStore.setState((state) => {
          if (state.specHtml === fallbackHtml) return state;
          return {
            ...state,
            specHtml: fallbackHtml,
          };
        });
      }
    }

    render();
  }, [tab, snapshotQuery.data, currentIdx, viewerStore]);

  // Post-process spec HTML (enhance tables, highlight diffs)
  useEffect(() => {
    if (tab !== "spec" || !specContentRef.current || !specHtml) return;
    enhanceTables(specContentRef.current);

    // Highlight diff context
    const patch = patchQuery.data;
    if (!patch || !specContentRef.current) return;

    const addedLines = getAddedPatchLines(currentIdx, patch);
    if (addedLines.size === 0) return;

    const walker = document.createTreeWalker(specContentRef.current, NodeFilter.SHOW_TEXT, null);
    const nodesToReplace: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const txt = stripMd(node.textContent || "");
      if (txt.length > 6 && addedLines.has(txt)) {
        nodesToReplace.push(node);
      }
    }
    nodesToReplace.forEach((n) => {
      if (n.parentNode && !(n.parentNode as HTMLElement).classList?.contains("diff-highlight")) {
        const span = document.createElement("span");
        span.className = "diff-highlight";
        span.textContent = n.textContent;
        n.parentNode.replaceChild(span, n);
      }
    });
  }, [tab, specHtml, currentIdx, patchQuery.data]);

  // ── Render diff when currentIdx or tab changes ──────────────────────
  useEffect(() => {
    if (tab !== "diff") return;
    if (typeof patchQuery.data !== "string") return;

    const patch = patchQuery.data;
    const nonce = ++renderNonceRef.current;
    const diffCacheKey = `${currentIdx}:${diffMode}`;

    const cachedDiffHtml = diffHtmlCache.get(diffCacheKey);
    if (cachedDiffHtml !== undefined) {
      viewerStore.setState((state) => {
        if (state.diffHtml === cachedDiffHtml) return state;
        return {
          ...state,
          diffHtml: cachedDiffHtml,
        };
      });
      return;
    }

    async function render() {
      if (!patch) {
        const noDiffHtml = '<div class="no-delta">NO DELTA</div>';
        diffHtmlCache.set(diffCacheKey, noDiffHtml);
        viewerStore.setState((state) => {
          if (state.diffHtml === noDiffHtml) return state;
          return {
            ...state,
            diffHtml: noDiffHtml,
          };
        });
        return;
      }

      try {
        const [diff2html, { ColorSchemeType }, domPurify] = await Promise.all([
          getDiff2HtmlModule(),
          getDiff2HtmlTypesModule(),
          getDomPurifyModule(),
        ]);
        const DOMPurify = domPurify.default;
        if (nonce !== renderNonceRef.current) return;

        const rendered = diff2html.html(patch, {
          drawFileList: false,
          matching: "lines",
          outputFormat: diffMode,
          colorScheme: ColorSchemeType.DARK,
        });

        const sanitized = DOMPurify.sanitize(rendered);
        diffHtmlCache.set(diffCacheKey, sanitized);
        viewerStore.setState((state) => {
          if (state.diffHtml === sanitized) return state;
          return {
            ...state,
            diffHtml: sanitized,
          };
        });
      } catch {
        const fallbackHtml = `<pre class="spec-fallback-pre">${escapeHtml(patch)}</pre>`;
        diffHtmlCache.set(diffCacheKey, fallbackHtml);
        viewerStore.setState((state) => {
          if (state.diffHtml === fallbackHtml) return state;
          return {
            ...state,
            diffHtml: fallbackHtml,
          };
        });
      }
    }

    render();
  }, [tab, patchQuery.data, currentIdx, diffMode, viewerStore]);

  // ── Render charts ───────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "timeline" || metrics.length === 0 || commits.length === 0) return;

    let cancelled = false;
    async function renderCharts() {
      const echarts = await import("echarts");
      if (cancelled) return;

      const baseTheme = {
        backgroundColor: "transparent",
        textStyle: {
          fontFamily: "JetBrains Mono, monospace",
          color: "#71717a",
        },
        grid: { top: 30, bottom: 30, left: 40, right: 20 },
      };

      if (chartVelocityRef.current) {
        if (!echartsRef.current.velocity) {
          echartsRef.current.velocity = echarts.init(chartVelocityRef.current) as EChartsLike;
        }

        echartsRef.current.velocity.setOption(
          {
            ...baseTheme,
            xAxis: {
              type: "category" as const,
              axisLine: { lineStyle: { color: "#27272a" } },
              splitLine: { show: false },
            },
            yAxis: {
              type: "value" as const,
              axisLine: { lineStyle: { color: "#27272a" } },
              splitLine: { lineStyle: { color: "#27272a" } },
            },
            series: [
              {
                id: "velocity-series",
                data: velocityChartData,
                type: "line",
                smooth: true,
                lineStyle: { color: "#14b8a6", width: 2 },
                markLine: {
                  symbol: ["none", "none"],
                  label: { show: false },
                  data: [{ xAxis: velocityChartData[currentIdxRef.current]?.[0] }],
                  lineStyle: {
                    color: "rgba(255, 255, 255, 0.4)",
                    type: "dashed" as const,
                  },
                },
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(20, 184, 166, 0.2)" },
                    { offset: 1, color: "rgba(20, 184, 166, 0)" },
                  ]),
                },
              },
            ],
          },
          true,
        );
      }

      if (chartDistRef.current) {
        if (!echartsRef.current.dist) {
          echartsRef.current.dist = echarts.init(chartDistRef.current) as EChartsLike;
        }

        echartsRef.current.dist.setOption(
          {
            ...baseTheme,
            series: [
              {
                type: "pie",
                radius: ["50%", "80%"],
                itemStyle: {
                  borderRadius: 5,
                  borderColor: "#020a05",
                  borderWidth: 2,
                },
                label: { show: false },
                data: distributionChartData,
              },
            ],
          },
          true,
        );
      }

      if (chartMassRef.current) {
        if (!echartsRef.current.mass) {
          echartsRef.current.mass = echarts.init(chartMassRef.current) as EChartsLike;
        }

        echartsRef.current.mass.setOption(
          {
            ...baseTheme,
            tooltip: { trigger: "axis" },
            xAxis: {
              type: "category" as const,
              data: massChartData.labels,
              axisLine: { lineStyle: { color: "#27272a" } },
            },
            yAxis: {
              type: "value" as const,
              axisLine: { lineStyle: { color: "#27272a" } },
              splitLine: { lineStyle: { color: "#27272a" } },
            },
            series: massChartData.series,
          },
          true,
        );
      }
    }

    renderCharts();
    return () => {
      cancelled = true;
    };
  }, [
    tab,
    metrics.length,
    commits.length,
    velocityChartData,
    distributionChartData,
    massChartData,
  ]);

  useEffect(() => {
    if (tab !== "timeline" || commits.length === 0) return;
    const chart = echartsRef.current.velocity;
    if (!chart) return;

    const selectedDate = commits[currentIdx]?.date;
    if (!selectedDate) return;

    chart.setOption({
      series: [
        {
          id: "velocity-series",
          markLine: {
            symbol: ["none", "none"],
            label: { show: false },
            data: [{ xAxis: selectedDate }],
            lineStyle: {
              color: "rgba(255, 255, 255, 0.4)",
              type: "dashed" as const,
            },
          },
        },
      ],
    });
  }, [tab, commits, currentIdx]);

  // ── Draw evolution map canvas ───────────────────────────────────────
  const drawEvolutionMap = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs || commits.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = cvs.clientWidth;
    const ch = cvs.clientHeight;
    if (!cw || !ch) return;

    const widthPx = Math.max(1, Math.round(cw * dpr));
    const heightPx = Math.max(1, Math.round(ch * dpr));
    if (cvs.width !== widthPx || cvs.height !== heightPx) {
      cvs.width = widthPx;
      cvs.height = heightPx;
      mapBackgroundCanvasRef.current = null;
    }

    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let background = mapBackgroundCanvasRef.current;
    if (!background || background.width !== widthPx || background.height !== heightPx) {
      background = document.createElement("canvas");
      background.width = widthPx;
      background.height = heightPx;

      const bgCtx = background.getContext("2d");
      if (!bgCtx) return;

      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgCtx.clearRect(0, 0, cw, ch);

      const barW = cw / commits.length;
      for (let i = 0; i < evolutionMapStacks.length; i++) {
        const stack = evolutionMapStacks[i];
        let cy = 0;

        for (let j = 0; j < stack.length; j++) {
          const segment = stack[j];
          const sh = segment.ratio * ch;
          bgCtx.fillStyle = bucketColorById.get(segment.bucketId) || BUCKETS[9].color;
          bgCtx.fillRect(i * barW, cy, Math.max(1, barW), sh);
          cy += sh;
        }
      }

      mapBackgroundCanvasRef.current = background;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.drawImage(background, 0, 0);

    const indicatorWidth = Math.max(2, Math.round(2 * dpr));
    const indicatorX = Math.round((currentIdx / commits.length) * cw * dpr);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(indicatorX - Math.floor(indicatorWidth / 2), 0, indicatorWidth, heightPx);
  }, [commits.length, currentIdx, evolutionMapStacks, bucketColorById]);

  useEffect(() => {
    mapBackgroundCanvasRef.current = null;
  }, [evolutionMapStacks]);

  useEffect(() => {
    drawEvolutionMapRef.current = drawEvolutionMap;
  }, [drawEvolutionMap]);

  useEffect(() => {
    drawEvolutionMap();
  }, [drawEvolutionMap]);

  useEffect(() => {
    function runResizeWork() {
      const refs = echartsRef.current;
      refs.velocity?.resize();
      refs.dist?.resize();
      refs.mass?.resize();
      drawEvolutionMapRef.current();
    }

    function handleResize() {
      if (resizeRafRef.current !== null) return;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        runResizeWork();
      });
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }

      const refs = echartsRef.current;
      refs.velocity?.dispose();
      refs.dist?.dispose();
      refs.mass?.dispose();
      echartsRef.current = { velocity: null, dist: null, mass: null };
    };
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────

  const selectCommit = useCallback(
    (idx: number) => {
      const target = Math.max(0, Math.min(commits.length - 1, idx));
      viewerStore.setState((state) => ({
        ...state,
        currentIdx: target,
      }));
      history.replaceState(null, "", `#entry-${target}`);
    },
    [commits.length, viewerStore],
  );

  const goPrev = useCallback(() => {
    const prevIdx = prevByCommitIdx.get(currentIdx);
    if (prevIdx !== undefined) {
      selectCommit(prevIdx);
    } else if (
      firstFilteredIdx !== undefined &&
      filteredIndexByCommitIdx.get(currentIdx) === undefined
    ) {
      selectCommit(firstFilteredIdx);
    }
  }, [prevByCommitIdx, firstFilteredIdx, filteredIndexByCommitIdx, currentIdx, selectCommit]);

  const goNext = useCallback(() => {
    const nextIdx = nextByCommitIdx.get(currentIdx);
    if (nextIdx !== undefined) {
      selectCommit(nextIdx);
    } else if (
      firstFilteredIdx !== undefined &&
      filteredIndexByCommitIdx.get(currentIdx) === undefined
    ) {
      selectCommit(firstFilteredIdx);
    }
  }, [nextByCommitIdx, firstFilteredIdx, filteredIndexByCommitIdx, currentIdx, selectCommit]);

  // ── Playback ────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    viewerStore.setState((state) => ({
      ...state,
      playing: !state.playing,
    }));
  }, [viewerStore]);

  useEffect(() => {
    if (!playing) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    if (firstFilteredIdx === undefined) {
      viewerStore.setState((state) => ({
        ...state,
        playing: false,
      }));
      return;
    }

    playIntervalRef.current = setInterval(() => {
      viewerStore.setState((state) => {
        const nextIdx = nextByCommitIdx.get(state.currentIdx);
        if (nextIdx !== undefined) {
          history.replaceState(null, "", `#entry-${nextIdx}`);
          return {
            ...state,
            currentIdx: nextIdx,
          };
        }

        // Not in filtered list - jump to first filtered entry
        if (
          filteredIndexByCommitIdx.get(state.currentIdx) === undefined &&
          firstFilteredIdx !== undefined
        ) {
          history.replaceState(null, "", `#entry-${firstFilteredIdx}`);
          return {
            ...state,
            currentIdx: firstFilteredIdx,
          };
        }

        // At end of filtered list - stop playing
        return {
          ...state,
          playing: false,
        };
      });
    }, 1500);

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [playing, firstFilteredIdx, nextByCommitIdx, filteredIndexByCommitIdx, viewerStore]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "KeyF":
          viewerStore.setState((state) => ({
            ...state,
            focusMode: !state.focusMode,
          }));
          break;
        case "KeyL":
          viewerStore.setState((state) => ({
            ...state,
            legendOpen: !state.legendOpen,
          }));
          break;
        case "Slash":
          e.preventDefault();
          document.querySelector<HTMLInputElement>(".spec-sidebar-search")?.focus();
          break;
        case "Escape":
          viewerStore.setState((state) => ({
            ...state,
            legendOpen: false,
            focusMode: false,
          }));
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, goPrev, goNext, viewerStore]);

  // ── Bucket filter toggle ────────────────────────────────────────────

  const toggleBucket = useCallback(
    (id: number) => {
      viewerStore.setState((state) => {
        const next = new Set(state.activeBuckets);
        if (next.has(id)) next.delete(id);
        else next.add(id);

        return {
          ...state,
          activeBuckets: next,
        };
      });
    },
    [viewerStore],
  );

  // ── Canvas click handler ────────────────────────────────────────────

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const idx = Math.floor((x / rect.width) * commits.length);
      if (idx >= 0 && idx < commits.length) selectCommit(idx);
    },
    [commits.length, selectCommit],
  );

  // ── Render ──────────────────────────────────────────────────────────

  if (bootstrapQuery.isPending) {
    return (
      <div className="spec-viewer">
        <div className="spec-loading">
          <div className="spec-loading-spinner" />
          <div className="spec-loading-text">Reanimating Neural Pathways...</div>
        </div>
      </div>
    );
  }

  if (bootstrapQuery.isError) {
    const errText =
      bootstrapQuery.error instanceof Error
        ? bootstrapQuery.error.message
        : String(bootstrapQuery.error);

    return (
      <div className="spec-viewer">
        <div className="spec-loading">
          <div className="text-red-500 font-mono text-xs uppercase tracking-widest">
            INIT_FAILURE: {errText}
          </div>
          <Link href="/" className="mt-6 btn-spec">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("spec-viewer", focusMode && "focus-mode")}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="spec-viewer-header">
          <div className="spec-viewer-brand">
            <Link
              href="/"
              className="btn-spec flex items-center gap-2"
              title="Back to FrankenSQLite"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden sm:inline">HOME</span>
            </Link>
            <span className="spec-viewer-brand-text hidden sm:inline">Spec Evolution Lab</span>
          </div>

          <div className="spec-viewer-kpi-row">
            <div className="spec-viewer-kpi">
              <span className="spec-viewer-kpi-label">Commits</span>
              <span className="spec-viewer-kpi-value">{commits.length}</span>
            </div>
            <div className="spec-viewer-kpi">
              <span className="spec-viewer-kpi-label">Lines</span>
              <span className="spec-viewer-kpi-value">{specLineCount.toLocaleString()}</span>
            </div>
          </div>

          <div className="spec-viewer-header-actions">
            <button
              onClick={() =>
                viewerStore.setState((state) => ({
                  ...state,
                  legendOpen: true,
                }))
              }
              className="btn-spec"
              title="Category Legend"
            >
              <Info className="w-3 h-3 inline mr-1" />
              LEGEND
            </button>
            <button
              onClick={() =>
                viewerStore.setState((state) => ({
                  ...state,
                  sidebarOpen: true,
                }))
              }
              className="btn-spec md:hidden"
              aria-label="Open commit sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="spec-viewer-body">
          {/* Sidebar */}
          {sidebarOpen && (
            <div
              className="spec-sidebar-backdrop md:hidden"
              onClick={() =>
                viewerStore.setState((state) => ({
                  ...state,
                  sidebarOpen: false,
                }))
              }
            />
          )}
          <aside className={cn("spec-sidebar", sidebarOpen && "mobile-active")}>
            <div className="spec-sidebar-header">
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  className="spec-sidebar-search"
                  placeholder="Search commits..."
                  value={query}
                  onChange={(e) =>
                    viewerStore.setState((state) => ({
                      ...state,
                      query: e.target.value,
                    }))
                  }
                />
                <button
                  onClick={() =>
                    viewerStore.setState((state) => ({
                      ...state,
                      sidebarOpen: false,
                    }))
                  }
                  className="md:hidden p-1 text-slate-500"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="spec-sidebar-sort-row">
                <span className="spec-sidebar-sort-label">Sort</span>
                <select
                  className="spec-sidebar-sort"
                  value={sortMode}
                  onChange={(e) =>
                    viewerStore.setState((state) => ({
                      ...state,
                      sortMode: e.target.value as CommitSortMode,
                    }))
                  }
                  aria-label="Sort commits"
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="impact">Highest Impact</option>
                  <option value="author">Author (A-Z)</option>
                </select>
              </div>

              <div className="spec-sidebar-filters">
                {BUCKETS.map((b) => (
                  <span
                    key={b.id}
                    className={cn("filter-pill", activeBuckets.has(b.id) && "active")}
                    style={
                      { "--pill-color": b.color, color: `${b.color}cc` } as React.CSSProperties
                    }
                    title={b.desc}
                    onClick={() => toggleBucket(b.id)}
                  >
                    {b.name}
                  </span>
                ))}
              </div>

              <div className="spec-sidebar-summary">
                {filtered.length} shown / {commits.length} total
              </div>
            </div>

            <div className="spec-sidebar-list" ref={commitListRef}>
              {filtered.length === 0 ? (
                <div className="spec-sidebar-empty">No commits match current filters.</div>
              ) : (
                <div
                  className="spec-sidebar-list-inner"
                  style={{ height: `${commitVirtualizer.getTotalSize()}px` }}
                >
                  {commitVirtualizer.getVirtualItems().map((virtualRow) => {
                    const c = filtered[virtualRow.index];
                    if (!c) return null;

                    const bucket = bucketById(c.primary);
                    const isSelected = c.idx === currentIdx;

                    return (
                      <div
                        key={c.idx}
                        ref={commitVirtualizer.measureElement}
                        data-idx={c.idx}
                        className="spec-sidebar-row"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <div
                          className={cn(
                            "commit-card",
                            isSelected && "selected",
                            isSelected && playing && "playing",
                          )}
                          onClick={() => {
                            selectCommit(c.idx);
                            viewerStore.setState((state) => ({
                              ...state,
                              sidebarOpen: false,
                            }));
                          }}
                        >
                          <div className="commit-card-header">
                            <span>#{c.idx}</span>
                            <span>{dayjs(c.date).format("MMM DD")}</span>
                          </div>
                          <div className="commit-card-subject">{c.subject}</div>
                          <div className="commit-card-meta">
                            <span
                              className="tag-pill"
                              style={{
                                color: bucket.color,
                                border: `1px solid ${bucket.color}20`,
                              }}
                            >
                              {bucket.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              +{c.add} / -{c.del}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="spec-main">
            <div className="spec-main-toolbar">
              <div className="spec-tabs">
                {(
                  [
                    ["spec", "THE_LEDGER"],
                    ["timeline", "DIAGNOSTICS"],
                    ["diff", "DELTA"],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    className={cn("spec-tab", tab === t && "active")}
                    onClick={() =>
                      viewerStore.setState((state) => ({
                        ...state,
                        tab: t,
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {tab === "diff" && (
                  <button
                    className="btn-spec"
                    onClick={() =>
                      viewerStore.setState((state) => ({
                        ...state,
                        diffMode:
                          state.diffMode === "line-by-line" ? "side-by-side" : "line-by-line",
                      }))
                    }
                  >
                    MODE: {diffMode === "line-by-line" ? "LINE" : "SIDE"}
                  </button>
                )}
                <span className="spec-active-label hidden sm:inline">
                  {currentCommit ? `LOG_ENTRY_${currentIdx} // ${currentCommit.short}` : ""}
                </span>
              </div>
            </div>

            <div className="spec-viewport">
              {/* Spec Tab */}
              <div className={cn("spec-scroll-pane", tab !== "spec" && "hidden")}>
                <div
                  ref={specContentRef}
                  className="spec-content"
                  dangerouslySetInnerHTML={{ __html: specHtml }}
                />
              </div>

              {/* Timeline/Charts Tab */}
              <div
                className={cn("spec-scroll-pane spec-charts-panel", tab !== "timeline" && "hidden")}
              >
                <div ref={chartVelocityRef} style={{ height: 250, marginBottom: 30 }} />
                <div ref={chartDistRef} style={{ height: 250, marginBottom: 30 }} />
                <div ref={chartMassRef} style={{ height: 350 }} />
              </div>

              {/* Diff Tab */}
              <div className={cn("spec-scroll-pane spec-diff-content", tab !== "diff" && "hidden")}>
                <div dangerouslySetInnerHTML={{ __html: diffHtml }} />
              </div>
            </div>
          </main>
        </div>

        {/* ── Dock ────────────────────────────────────────────────── */}
        <div className="spec-dock">
          <div className="spec-evolution-map">
            <canvas ref={canvasRef} className="spec-map-canvas" onClick={handleMapClick} />
          </div>
          <div className="spec-dock-controls">
            <div className="spec-dock-buttons">
              <button className="btn-spec" onClick={goPrev}>
                <ChevronLeft className="w-3 h-3 inline" /> PREV
              </button>
              <button className={cn("btn-spec", playing && "active")} onClick={togglePlay}>
                {playing ? (
                  <>
                    <Pause className="w-3 h-3 inline mr-1" />
                    SUSPEND
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 inline mr-1" />
                    REANIMATE
                  </>
                )}
              </button>
              <button className="btn-spec" onClick={goNext}>
                NEXT <ChevronRight className="w-3 h-3 inline" />
              </button>
              <button
                className={cn("btn-spec", focusMode && "active")}
                onClick={() =>
                  viewerStore.setState((state) => ({
                    ...state,
                    focusMode: !state.focusMode,
                  }))
                }
                aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
                aria-pressed={focusMode}
              >
                {focusMode ? (
                  <Minimize2 className="w-3 h-3 inline" />
                ) : (
                  <Maximize2 className="w-3 h-3 inline" />
                )}
              </button>
            </div>
            <div className="spec-dock-info">
              {currentCommit && (
                <>
                  <div className="spec-dock-subject">{currentCommit.subject}</div>
                  <div className="spec-dock-details">
                    {`HASH: ${currentCommit.short} // BY: ${currentCommit.author} // TIME: ${dayjs(currentCommit.date).format("MMM DD HH:mm")}`}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Focus mode exit button */}
        {focusMode && (
          <button
            className="btn-spec fixed top-4 right-4 z-[200]"
            onClick={() =>
              viewerStore.setState((state) => ({
                ...state,
                focusMode: false,
              }))
            }
          >
            EXIT FOCUS
          </button>
        )}
      </div>

      {/* ── Legend Overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {legendOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="legend-overlay active"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                viewerStore.setState((state) => ({
                  ...state,
                  legendOpen: false,
                }));
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="legend-card"
            >
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
                Evolutionary Categories
              </h3>
              <div className="legend-grid">
                {BUCKETS.map((b) => (
                  <div key={b.id} className="legend-item">
                    <div className="legend-item-header">
                      <div className="legend-dot" style={{ background: b.color }} />
                      <span className="legend-item-name">{b.name}</span>
                    </div>
                    <div className="legend-item-desc">{b.desc}</div>
                  </div>
                ))}
              </div>
              <button
                className="btn-spec w-full mt-5 text-center"
                onClick={() =>
                  viewerStore.setState((state) => ({
                    ...state,
                    legendOpen: false,
                  }))
                }
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function SpecEvolutionViewer() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            gcTime: Infinity,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SpecEvolutionViewerInner />
    </QueryClientProvider>
  );
}
