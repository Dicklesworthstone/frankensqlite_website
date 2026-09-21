"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Archive,
  Binary,
  Brain,
  Bug,
  Cog,
  Dna,
  FileCode,
  Fingerprint,
  FlaskConical,
  GitBranch,
  Image as ImageIcon,
  LayoutGrid,
  Mail,
  Microscope,
  Network,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Magnetic, Portal } from "@/components/motion-wrapper";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
import { flywheelDescription, flywheelTools } from "@/lib/content";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { FrankenBolt, FrankenContainer, FrankenStitch, NeuralPulse } from "./franken-elements";
import FrankenGlitch from "./franken-glitch";

// --- Inline BottomSheet (mobile detail panel) ---
function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const prefersReducedMotion = useReducedMotion();
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex flex-col justify-end lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={onClose}
              aria-hidden
            />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={title ? undefined : "Details"}
              aria-labelledby={title ? headingId : undefined}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", damping: 30, stiffness: 300, mass: 0.8 }
              }
              className="relative z-10 w-full max-h-[92vh] overflow-hidden rounded-t-[2.5rem] border-t border-teal-500/20 bg-[#020a05] shadow-[0_-20px_80px_rgba(0,0,0,0.8)] flex flex-col"
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#020a05]/90 px-8 py-6 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <Binary size={20} />
                  </div>
                  {title && (
                    <h3
                      id={headingId}
                      className="text-xl font-black uppercase tracking-widest text-white"
                    >
                      {title}
                    </h3>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all group"
                  aria-label="Close"
                >
                  <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                <div className="mx-auto max-w-4xl w-full">{children}</div>
              </div>
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-500/40" />
                  <span>Lexicon_Protocol_Secure</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-1 w-4 rounded-full bg-white/5" />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}

const iconMap: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  LayoutGrid,
  GitBranch,
  Search,
  Cog,
  Activity,
  Image: ImageIcon,
  Archive,
  FileCode,
  Sparkles,
  ShieldCheck,
  Mail,
  Bug,
  Brain,
  ShieldAlert,
  RefreshCw,
  Microscope,
  Radio,
  FlaskConical,
  Dna,
  Fingerprint,
};

// Per-tool accent hex colors
const toolAccentColors: Record<string, string> = {
  ntm: "#38bdf8",
  slb: "#f87171",
  mail: "#fbbf24",
  bv: "#a78bfa",
  ubs: "#fb923c",
  cm: "#34d399",
  cass: "#22d3ee",
  acfs: "#60a5fa",
  dcg: "#ef4444",
  ru: "#2dd4bf",
  giil: "#e879f9",
  xf: "#818cf8",
  s2p: "#a3e635",
  ms: "#f472b6",
};

const DEFAULT_ACCENT = "#4ade80";

function getAccent(id: string | null): string {
  return id ? (toolAccentColors[id] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT;
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// --- CONSTANTS ---
const CONTAINER_SIZE = 600;
const RADIUS = 220;
const CENTER = CONTAINER_SIZE / 2;
const NODE_SIZE = 60;

const SPECTRUM = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#ef4444",
  "#fb923c",
  "#fbbf24",
  "#34d399",
  "#22d3ee",
];

function getNodePosition(index: number, total: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS,
    y: CENTER + Math.sin(angle) * RADIUS,
  };
}

function getLightningPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const segments = 4;
  const path = [`M ${from.x} ${from.y}`];
  const dx = (to.x - from.x) / segments;
  const dy = (to.y - from.y) / segments;

  for (let i = 1; i < segments; i++) {
    const jitter = 12;
    const midX = from.x + dx * i + (Math.random() - 0.5) * jitter;
    const midY = from.y + dy * i + (Math.random() - 0.5) * jitter;
    path.push(`L ${midX} ${midY}`);
  }

  path.push(`L ${to.x} ${to.y}`);
  return path.join(" ");
}

function LightningArc({
  from,
  to,
  color,
  dimColor,
  active,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  dimColor: string;
  active: boolean;
}) {
  const [path, setPath] = useState(() => getLightningPath(from, to));

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPath(getLightningPath(from, to)), 60 + Math.random() * 60);
    return () => clearInterval(id);
  }, [from, to, active]);

  return (
    <motion.path
      d={path}
      fill="none"
      stroke={active ? color : dimColor}
      strokeWidth={active ? 2.5 : 0.5}
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? [0.4, 1, 0.6, 1, 0.3] : 0.08 }}
      transition={active ? { repeat: Infinity, duration: 0.2 } : {}}
      style={{ filter: active ? `drop-shadow(0 0 10px ${color})` : "none" }}
    />
  );
}

function prng(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function NeuralFragments() {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        x: prng(i * 17.1) * CONTAINER_SIZE,
        y: prng(i * 29.3) * CONTAINER_SIZE,
        size: 2 + prng(i * 43.7) * 5,
        duration: 8 + prng(i * 59.9) * 20,
        driftX: prng(i * 71.2) * 120 - 60,
        driftY: prng(i * 83.1) * 120 - 60,
        color: SPECTRUM[i % SPECTRUM.length],
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none opacity-30">
      {bits.map((bit) => (
        <motion.div
          key={bit.id}
          className="absolute rounded-full"
          style={{
            width: bit.size,
            height: bit.size,
            left: bit.x,
            top: bit.y,
            backgroundColor: withAlpha(bit.color, 0.5),
          }}
          animate={{
            x: [0, bit.driftX, 0],
            y: [0, bit.driftY, 0],
            opacity: [0.15, 0.7, 0.15],
          }}
          transition={{ duration: bit.duration, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function NodePulse({ active, color }: { active: boolean; color: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ scale: 0.8, opacity: 0, border: `2px solid ${color}` }}
          animate={{ scale: 1.5, opacity: [0, 0.6, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
}

function NodeHoverHUD({
  tool,
  color,
  x,
}: {
  tool: (typeof flywheelTools)[0];
  color: string;
  x: number;
}) {
  const isRightSide = x > CENTER;

  return (
    <motion.div
      initial={{ opacity: 0, x: isRightSide ? 10 : -10, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: isRightSide ? 10 : -10, scale: 0.95 }}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-[110] pointer-events-none hidden lg:block",
        isRightSide ? "right-full mr-6" : "left-full ml-6",
      )}
    >
      <div
        className="glass-modern border p-5 rounded-2xl min-w-[260px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
        style={{ borderColor: withAlpha(color, 0.4), backgroundColor: "rgba(2,6,4,0.98)" }}
      >
        <div
          className="absolute top-0 left-0 w-2 h-2 border-t border-l opacity-40"
          style={{ borderColor: color }}
        />
        <div
          className="absolute bottom-0 right-0 w-2 h-2 border-b border-r opacity-40"
          style={{ borderColor: color }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
              Node_Detected
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
              <Zap className="h-2 w-2" style={{ color }} />
              <span className="text-[8px] font-mono font-black" style={{ color }}>
                {tool.id.toUpperCase()}
              </span>
            </div>
          </div>
          <h4 className="text-xl font-black text-white uppercase tracking-tight mb-1 italic">
            {tool.name}
          </h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-5">
            {tool.tagline}
          </p>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-4">
            <div className="space-y-1">
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">
                Stars
              </span>
              <div className="text-sm font-black text-white font-mono flex items-center gap-1">
                {tool.stars || "---"}
                <Star className="h-2.5 w-2.5 text-yellow-500/50" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">
                Link_Density
              </span>
              <div className="text-sm font-black text-white font-mono" style={{ color }}>
                {Math.round((tool.connectsTo.length / flywheelTools.length) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function FrankenFlywheel() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isGlitching, setIsGlitching] = useState(false);
  const { lightTap, mediumTap, errorTap } = useHapticFeedback();

  const activeId = selectedId || hoveredId;
  const selectedTool = flywheelTools.find((t) => t.id === selectedId) || null;
  const activeAccent = getAccent(activeId);

  const glitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
    };
  }, []);

  const handleSelect = useCallback(
    (id: string | null) => {
      if (id === selectedId) {
        setSelectedId(null);
        lightTap();
      } else {
        setSelectedId(id);
        setIsGlitching(true);
        if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
        glitchTimeoutRef.current = setTimeout(() => setIsGlitching(false), 300);
        mediumTap();
        if (id) errorTap();
      }
    },
    [selectedId, lightTap, mediumTap, errorTap],
  );

  const positions = useMemo(
    () =>
      flywheelTools.reduce(
        (acc, tool, index) => {
          acc[tool.id] = getNodePosition(index, flywheelTools.length);
          return acc;
        },
        {} as Record<string, { x: number; y: number }>,
      ),
    [],
  );

  const connections = useMemo(() => {
    const lines: { from: string; to: string }[] = [];
    const seen = new Set<string>();
    flywheelTools.forEach((tool) => {
      tool.connectsTo.forEach((target) => {
        const key = [tool.id, target].sort().join("-");
        if (!seen.has(key)) {
          seen.add(key);
          lines.push({ from: tool.id, to: target });
        }
      });
    });
    return lines;
  }, []);

  const panelAccent = selectedTool ? getAccent(selectedTool.id) : DEFAULT_ACCENT;

  return (
    <div className="relative py-24 md:py-32">
      <AnimatePresence>
        {isGlitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0.05, 0.2, 0] }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] pointer-events-none mix-blend-overlay"
            style={{ backgroundColor: withAlpha(activeAccent, 0.15) }}
          />
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20 w-full justify-center">
        <div
          className="h-px w-12 md:w-24"
          style={{
            background: `linear-gradient(to right, transparent, ${withAlpha("#38bdf8", 0.3)}, transparent)`,
          }}
        />
        <div
          className="px-4 py-1 rounded-full border backdrop-blur-md"
          style={{
            borderColor: withAlpha(activeAccent, 0.25),
            backgroundColor: withAlpha(activeAccent, 0.05),
          }}
        >
          <span
            className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] whitespace-nowrap"
            style={{ color: withAlpha(activeAccent, 0.7) }}
          >
            Neural_Containment_Field v4.2
          </span>
        </div>
        <div
          className="h-px w-12 md:w-24"
          style={{
            background: `linear-gradient(to left, transparent, ${withAlpha("#a78bfa", 0.3)}, transparent)`,
          }}
        />
      </div>

      <FrankenContainer
        withPulse={true}
        className="max-w-[1600px] mx-auto bg-black/60 border-white/5 shadow-[0_0_150px_rgba(0,0,0,0.8)] overflow-visible"
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, ${withAlpha(activeAccent, 0.25)} 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="grid lg:grid-cols-[1fr,1.5fr] xl:grid-cols-[1fr,1.8fr] gap-0 items-stretch">
          {/* THE REACTOR STAGE */}
          <div className="relative flex items-center justify-center p-6 md:p-12 border-r border-white/5 min-h-[500px] md:min-h-[700px] overflow-visible">
            <NeuralFragments />

            <div
              className="relative scale-[var(--flywheel-scale)] md:scale-[0.85] xl:scale-100"
              style={
                {
                  width: CONTAINER_SIZE,
                  height: CONTAINER_SIZE,
                  "--flywheel-scale": 0.5,
                } as React.CSSProperties
              }
            >
              <svg
                className="absolute inset-0 overflow-visible"
                width={CONTAINER_SIZE}
                height={CONTAINER_SIZE}
              >
                {connections.map((conn) => {
                  const isFromActive = activeId === conn.from;
                  const isToActive = activeId === conn.to;
                  const active = isFromActive || isToActive;
                  const arcColor = isFromActive
                    ? getAccent(conn.from)
                    : isToActive
                      ? getAccent(conn.to)
                      : DEFAULT_ACCENT;
                  const dimColor = withAlpha(getAccent(conn.from), 0.12);
                  return (
                    <LightningArc
                      key={`${conn.from}-${conn.to}`}
                      from={positions[conn.from]}
                      to={positions[conn.to]}
                      color={arcColor}
                      dimColor={dimColor}
                      active={active}
                    />
                  );
                })}
              </svg>

              <div
                className="absolute"
                style={{ left: CENTER - 80, top: CENTER - 80, width: 160, height: 160 }}
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full"
                    style={{
                      borderStyle: i === 1 ? "dashed" : "dotted",
                      borderWidth: 1,
                      borderColor: withAlpha(SPECTRUM[i * 2], 0.15),
                      padding: i * 8,
                    }}
                    animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                    transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "linear" }}
                  />
                ))}

                <motion.div
                  className="absolute inset-12 rounded-full flex items-center justify-center group cursor-pointer"
                  style={{
                    backgroundColor: withAlpha(activeAccent, 0.08),
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: withAlpha(activeAccent, 0.5),
                  }}
                  animate={{
                    boxShadow: [
                      `0 0 20px ${withAlpha(activeAccent, 0.2)}`,
                      `0 0 60px ${withAlpha(activeAccent, 0.5)}`,
                      `0 0 20px ${withAlpha(activeAccent, 0.2)}`,
                    ],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  onClick={() => handleSelect(null)}
                >
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: withAlpha(activeAccent, 0.15) }}
                  />
                  <Zap className="h-10 w-10 z-10" style={{ color: activeAccent }} />
                </motion.div>
              </div>

              {flywheelTools.map((tool, i) => {
                const isSelected = selectedId === tool.id;
                const isHovered = hoveredId === tool.id;
                const isConnected =
                  !!activeId &&
                  (tool.connectsTo.includes(activeId) ||
                    flywheelTools.find((t) => t.id === activeId)?.connectsTo.includes(tool.id) ||
                    false);
                const isDimmed = !!activeId && activeId !== tool.id && !isConnected;
                const nodeColor = getAccent(tool.id);

                return (
                  <motion.div
                    key={tool.id}
                    className="absolute"
                    style={{
                      left: positions[tool.id].x - NODE_SIZE / 2,
                      top: positions[tool.id].y - NODE_SIZE / 2,
                      width: NODE_SIZE,
                      height: NODE_SIZE,
                      zIndex: isSelected ? 100 : 50,
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, opacity: isDimmed ? 0.2 : 1 }}
                    transition={{ type: "spring", delay: i * 0.02 }}
                  >
                    <AnimatePresence>
                      {isHovered && !selectedId && (
                        <NodeHoverHUD tool={tool} color={nodeColor} x={positions[tool.id].x} />
                      )}
                    </AnimatePresence>

                    <Magnetic strength={0.5}>
                      <button
                        onClick={() => handleSelect(tool.id)}
                        onMouseEnter={() => setHoveredId(tool.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="relative w-full h-full rounded-xl border flex flex-col items-center justify-center transition-all duration-500 overflow-visible group"
                        style={{
                          backgroundColor: isSelected
                            ? withAlpha(nodeColor, 0.3)
                            : isHovered
                              ? withAlpha(nodeColor, 0.1)
                              : "rgba(0,0,0,0.8)",
                          borderColor: isSelected
                            ? nodeColor
                            : isHovered
                              ? withAlpha(nodeColor, 0.5)
                              : "rgba(255,255,255,0.1)",
                          boxShadow: isSelected
                            ? `0 0 50px ${withAlpha(nodeColor, 0.5)}`
                            : isHovered
                              ? `0 0 20px ${withAlpha(nodeColor, 0.2)}`
                              : "none",
                        }}
                      >
                        <NodePulse active={isSelected} color={nodeColor} />
                        <div
                          className={cn(
                            "relative z-10 transition-transform duration-500",
                            isSelected && "scale-110",
                          )}
                        >
                          {React.createElement(iconMap[tool.icon] || Zap, {
                            className: "h-6 w-6 mb-1",
                            style: {
                              color: isSelected
                                ? "#ffffff"
                                : isHovered
                                  ? nodeColor
                                  : withAlpha(nodeColor, 0.7),
                            },
                          })}
                        </div>
                        <span
                          className="text-[7px] font-black uppercase tracking-tighter transition-colors"
                          style={{
                            color: isSelected
                              ? "#ffffff"
                              : isHovered
                                ? nodeColor
                                : "rgb(148,163,184)",
                          }}
                        >
                          {tool.shortName}
                        </span>
                        <FrankenBolt
                          color={nodeColor}
                          baseScale={0.3}
                          className="absolute -left-1.5 -top-1.5 opacity-20"
                        />
                        <FrankenBolt
                          color={nodeColor}
                          baseScale={0.3}
                          className="absolute -right-1.5 -bottom-1.5 opacity-20"
                        />
                      </button>
                    </Magnetic>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* THE FORENSIC DASHBOARD */}
          <div className="relative bg-white/[0.01] flex flex-col h-full min-h-[600px] md:min-h-[700px] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-white/5 lg:hidden" />

            <AnimatePresence mode="wait">
              {selectedTool ? (
                <motion.div
                  key={selectedTool.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col h-full overflow-hidden"
                >
                  <div className="p-10 md:p-12 border-b border-white/5 bg-white/[0.02] relative overflow-hidden shrink-0">
                    <div
                      className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30"
                      style={{ color: panelAccent }}
                    />
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div
                            className="flex items-center gap-3 px-3 py-1.5 rounded-lg border shadow-xl"
                            style={{
                              backgroundColor: withAlpha(panelAccent, 0.12),
                              borderColor: withAlpha(panelAccent, 0.3),
                            }}
                          >
                            <Microscope className="h-3.5 w-3.5" style={{ color: panelAccent }} />
                            <span
                              className="text-[10px] font-black uppercase tracking-widest"
                              style={{ color: panelAccent }}
                            >
                              Node_Analysis_Active
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-600 border border-white/5 px-2 py-1 rounded bg-black/40">
                            UUID: {selectedTool.id.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-3 text-left">
                          <FrankenGlitch trigger="always" intensity="low">
                            <h3 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
                              {selectedTool.name}
                            </h3>
                          </FrankenGlitch>
                          <p
                            className="text-sm font-bold uppercase tracking-[0.4em]"
                            style={{ color: withAlpha(panelAccent, 0.8) }}
                          >
                            {selectedTool.tagline}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-8 items-center bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner shrink-0">
                        <div className="text-center space-y-1">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">
                            GitHub_Stars
                          </span>
                          <div className="text-3xl font-black text-white font-mono tracking-tighter">
                            <AnimatedNumber value={selectedTool.stars || 0} />
                          </div>
                        </div>
                        <div className="w-px h-10 bg-white/5" />
                        <div className="text-center space-y-1">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">
                            Connectivity
                          </span>
                          <div
                            className="text-3xl font-black font-mono tracking-tighter"
                            style={{ color: panelAccent }}
                          >
                            <AnimatedNumber
                              value={Math.round(
                                (selectedTool.connectsTo.length / flywheelTools.length) * 100,
                              )}
                              suffix="%"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-10 md:p-12 overflow-y-auto custom-scrollbar bg-black/20">
                    <div className="grid md:grid-cols-2 gap-12 text-left">
                      <div className="space-y-8">
                        <div className="flex items-center gap-3">
                          <LayoutGrid className="h-4 w-4" style={{ color: panelAccent }} />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                            Functionality_Matrix
                          </h4>
                        </div>
                        <div className="grid gap-3">
                          {selectedTool.features.map((f, fi) => (
                            <motion.div
                              key={f}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: fi * 0.05 }}
                              className="group/feature relative p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all flex items-center gap-5 overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover/feature:opacity-100 transition-opacity" />
                              <div
                                className="h-1.5 w-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                                style={{ backgroundColor: panelAccent, color: panelAccent }}
                              />
                              <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors relative z-10">
                                {f}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center gap-3">
                          <Network className="h-4 w-4" style={{ color: panelAccent }} />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                            Synaptic_Pathways
                          </h4>
                        </div>
                        <div className="space-y-4">
                          {selectedTool.connectsTo.map((tid, ti) => {
                            const target = flywheelTools.find((t) => t.id === tid);
                            if (!target) return null;
                            const targetColor = getAccent(tid);
                            return (
                              <motion.div
                                key={tid}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + ti * 0.05 }}
                                className="relative p-5 rounded-2xl border border-white/5 bg-black/40 group/path"
                              >
                                <div
                                  className="absolute top-0 left-0 bottom-0 w-1 rounded-l-full transition-all group-hover/path:w-2"
                                  style={{ backgroundColor: targetColor }}
                                />
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className="text-[10px] font-black uppercase tracking-widest transition-colors"
                                    style={{ color: targetColor }}
                                  >
                                    {target.name}
                                  </span>
                                  <span className="text-[8px] font-mono text-slate-700">
                                    LINK_0{ti + 1}
                                  </span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic pr-4">
                                  &ldquo;{selectedTool.connectionDescriptions[tid]}&rdquo;
                                </p>
                                <div className="mt-4 h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.5, delay: 0.5 + ti * 0.1 }}
                                    className="h-full opacity-40"
                                    style={{ backgroundColor: targetColor }}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 md:p-12 border-t border-white/5 bg-black/40 relative shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                      <div className="flex-1 text-center md:text-left">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">
                          Operation_Finalization
                        </p>
                        <p className="text-sm font-medium text-slate-400">
                          Initiate deep extraction protocol for the{" "}
                          <strong className="text-white">{selectedTool.name}</strong> data
                          repository.
                        </p>
                      </div>
                      <Magnetic strength={0.2}>
                        <a
                          href={selectedTool.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-4 px-12 py-6 rounded-2xl text-black font-black text-xs uppercase tracking-[0.25em] hover:brightness-110 transition-all active:scale-95 shadow-2xl group/cta"
                          style={{
                            backgroundColor: panelAccent,
                            boxShadow: `0 0 50px ${withAlpha(panelAccent, 0.4)}`,
                          }}
                        >
                          <FlaskConical className="h-5 w-5 animate-bounce group-hover:scale-125 transition-transform" />
                          EXTRACT_PROTOCOL
                        </a>
                      </Magnetic>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col h-full items-center justify-center p-12 md:p-20 text-center space-y-12 relative"
                >
                  <div className="absolute top-12 left-12 w-12 h-12 border-t border-l border-white/10" />
                  <div className="absolute top-12 right-12 w-12 h-12 border-t border-r border-white/10" />
                  <div className="absolute bottom-12 left-12 w-12 h-12 border-b border-l border-white/10" />
                  <div className="absolute bottom-12 right-12 w-12 h-12 border-b border-r border-white/10" />

                  <div className="space-y-8 relative z-10 max-w-lg">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Dna className="h-16 w-16 text-teal-500 animate-spin-slow opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="h-6 w-6 text-teal-500 animate-pulse" />
                        </div>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.5em] text-teal-500/40">
                        Neural_Network_Online
                      </span>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-6xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">
                        The AI <br /> <span className="text-animate-green">Flywheel.</span>
                      </h3>
                      <p className="text-xl text-slate-400 font-medium leading-relaxed italic opacity-60 px-8">
                        &ldquo;{flywheelDescription.subtitle}&rdquo;
                      </p>
                    </div>
                    <div className="p-8 rounded-[2.5rem] border border-white/5 bg-black/40 relative overflow-hidden shadow-inner group">
                      <div className="absolute inset-0 bg-teal-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <NeuralPulse color="#14b8a6" className="opacity-20" />
                      <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-[0.2em] relative z-10">
                        {flywheelDescription.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-8 pt-8">
                      <div className="space-y-2">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
                          Active_Nodes
                        </span>
                        <div className="text-3xl font-black text-white font-mono">
                          {flywheelTools.length}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
                          Stability
                        </span>
                        <div className="text-3xl font-black text-teal-500 font-mono">100%</div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
                          Uptime
                        </span>
                        <div className="text-3xl font-black text-white font-mono">14d</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute top-6 right-8 flex items-center gap-4 opacity-30 pointer-events-none">
          <motion.div
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2"
          >
            <Radio className="h-3 w-3" style={{ color: activeAccent }} />
            <span className="text-[8px] font-mono tracking-[0.2em]" style={{ color: activeAccent }}>
              SIGNAL_LOCK_STABLE
            </span>
          </motion.div>
        </div>
        <div className="absolute bottom-6 left-8 opacity-10 pointer-events-none">
          <FrankenStitch className="w-32" />
        </div>
      </FrankenContainer>

      <BottomSheet
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedTool?.name}
      >
        {selectedTool && (
          <div className="space-y-10 text-left pb-16">
            <div className="flex items-start gap-6">
              <div
                className="h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-2xl border"
                style={{ backgroundColor: `${panelAccent}20`, borderColor: `${panelAccent}40` }}
              >
                {React.createElement(iconMap[selectedTool.icon] || Zap, {
                  className: "h-8 w-8",
                  style: { color: panelAccent },
                })}
              </div>
              <div className="pt-1">
                <h4 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                  {selectedTool.name}
                </h4>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2"
                  style={{ color: panelAccent }}
                >
                  {selectedTool.tagline}
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {selectedTool.features.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-4 text-sm font-bold text-slate-300 bg-white/5 p-5 rounded-2xl border border-white/5"
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: panelAccent, boxShadow: `0 0 8px ${panelAccent}` }}
                  />
                  {f}
                </div>
              ))}
            </div>
            <a
              href={selectedTool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-4 w-full py-6 rounded-2xl text-black font-black text-sm uppercase tracking-[0.2em] shadow-2xl"
              style={{ backgroundColor: panelAccent }}
            >
              <Radio className="h-4 w-4" /> REPOSITORY_PROTOCOL
            </a>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
