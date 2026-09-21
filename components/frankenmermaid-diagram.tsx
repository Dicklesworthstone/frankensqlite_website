"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { FrankenContainer } from "@/components/franken-elements";
import { architectureLayers } from "@/lib/content";

/* ------------------------------------------------------------------ */
/*  Display layers top-to-bottom: Integration → Foundation             */
/* ------------------------------------------------------------------ */
const layersTopDown = [...architectureLayers].reverse();

/* ------------------------------------------------------------------ */
/*  Tailwind class → hex for SVG fills/strokes                         */
/* ------------------------------------------------------------------ */
const COLOR_HEX: Record<string, string> = {
  "text-teal-400": "#2dd4bf",
  "text-blue-400": "#60a5fa",
  "text-amber-400": "#fbbf24",
  "text-purple-400": "#a78bfa",
  "text-rose-400": "#fb7185",
  "text-teal-300": "#5eead4",
};

/* ------------------------------------------------------------------ */
/*  SVG layout constants                                               */
/* ------------------------------------------------------------------ */
const VB_W = 800;
const VB_H = 580;
const BAND_X = 15;
const BAND_W = 770;
const BAND_H = 78;
const BAND_GAP = 16;
const BAND_Y0 = 16;
const BADGE_CX = BAND_X + 18;
const LABEL_X = BAND_X + 36;
const CRATE_X0 = BAND_X + 16;
const CRATE_AREA_W = BAND_W - 32;
const NODE_H = 20;
const NODE_GAP = 5;
const NODE_CHAR_W = 5;
const NODE_PAD = 16;
const CONN_XS = [VB_W * 0.3, VB_W * 0.5, VB_W * 0.7];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type CratePos = { name: string; x: number; y: number; w: number };

type LayerLayout = {
  y: number;
  hex: string;
  num: number;
  name: string;
  crates: CratePos[];
};

type ConnPath = { id: string; d: string; from: number; to: number };

/* ------------------------------------------------------------------ */
/*  Layout computation (pure, stable)                                  */
/* ------------------------------------------------------------------ */
function computeLayout(): LayerLayout[] {
  return layersTopDown.map((layer, i) => {
    const y = BAND_Y0 + i * (BAND_H + BAND_GAP);
    const hex = COLOR_HEX[layer.color] ?? "#2dd4bf";
    const num = layersTopDown.length - i;
    const crates: CratePos[] = [];

    let cx = CRATE_X0;
    let row = 0;

    for (const name of layer.crates) {
      const w = name.length * NODE_CHAR_W + NODE_PAD;
      if (cx + w > CRATE_X0 + CRATE_AREA_W && cx > CRATE_X0) {
        row++;
        cx = CRATE_X0;
      }
      crates.push({ name, x: cx, y: y + 44 + row * 26, w });
      cx += w + NODE_GAP;
    }

    return { y, hex, num, name: layer.name, crates };
  });
}

function buildConns(layers: LayerLayout[]): ConnPath[] {
  const out: ConnPath[] = [];
  for (let i = 0; i < layers.length - 1; i++) {
    const y1 = layers[i].y + BAND_H;
    const y2 = layers[i + 1].y;
    const mid = (y1 + y2) / 2;
    CONN_XS.forEach((x, xi) => {
      out.push({
        id: `c${i}${xi}`,
        d: `M ${x} ${y1} C ${x} ${mid}, ${x} ${mid}, ${x} ${y2}`,
        from: i,
        to: i + 1,
      });
    });
  }
  return out;
}

type Particle = { pathId: string; dur: string; delay: string };

function buildParticles(layerCount: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < layerCount - 1; i++) {
    out.push({
      pathId: `c${i}1`,
      dur: `${2.5 + (i % 3) * 0.5}s`,
      delay: `${i * 0.45}s`,
    });
    out.push({
      pathId: `c${i}${i % 2 === 0 ? 0 : 2}`,
      dur: `${3.0 + ((i + 1) % 3) * 0.4}s`,
      delay: `${i * 0.45 + 1.3}s`,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Grid lines (computed once)                                         */
/* ------------------------------------------------------------------ */
const GRID_V = Array.from({ length: Math.floor(VB_W / 40) + 1 }, (_, i) => i * 40);
const GRID_H = Array.from({ length: Math.floor(VB_H / 40) + 1 }, (_, i) => i * 40);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function FrankenMermaidDiagram() {
  const [hovered, setHovered] = useState<number | null>(null);
  const prefRM = useReducedMotion();
  const dur = prefRM ? 0 : 0.25;

  const layers = useMemo(() => computeLayout(), []);
  const conns = useMemo(() => buildConns(layers), [layers]);
  const particles = useMemo(
    () => (prefRM ? [] : buildParticles(layers.length)),
    [layers.length, prefRM],
  );

  return (
    <FrankenContainer
      withBolts
      withStitches
      withPulse
      accentColor="#14b8a6"
      className="relative p-0 overflow-hidden bg-black/60"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-teal-500/8 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 w-[30%] h-[30%] bg-teal-400/5 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500">
            Architecture_Overview
          </span>
        </div>

        {/* SVG Blueprint */}
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto"
          role="img"
          aria-label="FrankenSQLite architecture: 6 layers from Integration down to Foundation"
        >
          <defs>
            <filter id="archGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dotGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Blueprint grid */}
          <g opacity={0.03} strokeWidth={0.5} stroke="#fff">
            {GRID_V.map((x) => (
              <line key={`v${x}`} x1={x} y1={0} x2={x} y2={VB_H} />
            ))}
            {GRID_H.map((y) => (
              <line key={`h${y}`} x1={0} y1={y} x2={VB_W} y2={y} />
            ))}
          </g>

          {/* Hidden path refs for particle <mpath> */}
          {conns.map(({ id, d }) => (
            <path key={`ref-${id}`} id={id} d={d} fill="none" stroke="none" />
          ))}

          {/* Visible animated connection lines */}
          {conns.map(({ id, d, from, to }) => {
            const lit = hovered === from || hovered === to;
            return (
              <motion.path
                key={`vis-${id}`}
                d={d}
                fill="none"
                stroke="#2dd4bf"
                strokeDasharray={lit ? "none" : "4 3"}
                animate={{
                  opacity: lit ? 0.35 : 0.08,
                  strokeWidth: lit ? 1.5 : 0.75,
                }}
                transition={{ duration: dur }}
              />
            );
          })}

          {/* Flow particles */}
          {particles.map((p, pi) => (
            <g key={`p${pi}`}>
              <circle r={5} fill="#2dd4bf" opacity={0.12} filter="url(#dotGlow)">
                <animateMotion dur={p.dur} begin={p.delay} repeatCount="indefinite">
                  <mpath href={`#${p.pathId}`} />
                </animateMotion>
              </circle>
              <circle r={2} fill="#5eead4" opacity={0.7}>
                <animateMotion dur={p.dur} begin={p.delay} repeatCount="indefinite">
                  <mpath href={`#${p.pathId}`} />
                </animateMotion>
              </circle>
            </g>
          ))}

          {/* Layer bands */}
          {layers.map((L, i) => {
            const on = hovered === i;
            const dim = hovered !== null && !on;

            return (
              <g
                key={L.name}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Band background */}
                <motion.rect
                  x={BAND_X}
                  y={L.y}
                  width={BAND_W}
                  height={BAND_H}
                  rx={10}
                  fill={L.hex}
                  stroke={L.hex}
                  strokeWidth={1}
                  animate={{
                    fillOpacity: on ? 0.1 : dim ? 0.015 : 0.04,
                    strokeOpacity: on ? 0.4 : dim ? 0.04 : 0.12,
                  }}
                  transition={{ duration: dur }}
                />

                {/* Layer number badge */}
                <circle
                  cx={BADGE_CX}
                  cy={L.y + 20}
                  r={10}
                  fill={L.hex}
                  fillOpacity={0.15}
                  stroke={L.hex}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
                <text
                  x={BADGE_CX}
                  y={L.y + 24}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="bold"
                  fill={L.hex}
                  fontFamily="ui-monospace, monospace"
                >
                  {L.num}
                </text>

                {/* Layer name */}
                <motion.text
                  x={LABEL_X}
                  y={L.y + 24}
                  fontSize={11}
                  fontWeight={800}
                  fill={L.hex}
                  letterSpacing="0.08em"
                  style={{ textTransform: "uppercase" as const }}
                  animate={{ fillOpacity: on ? 1 : dim ? 0.3 : 0.85 }}
                  transition={{ duration: dur }}
                >
                  {L.name.toUpperCase()}
                </motion.text>

                {/* Crate nodes */}
                {L.crates.map((c) => (
                  <g key={c.name}>
                    <motion.rect
                      x={c.x}
                      y={c.y}
                      width={c.w}
                      height={NODE_H}
                      rx={5}
                      fill="rgba(0,0,0,0.5)"
                      stroke={L.hex}
                      strokeWidth={0.75}
                      animate={{
                        strokeOpacity: on ? 0.5 : dim ? 0.04 : 0.15,
                      }}
                      transition={{ duration: dur }}
                      filter={on ? "url(#archGlow)" : undefined}
                    />
                    <motion.text
                      x={c.x + c.w / 2}
                      y={c.y + NODE_H / 2 + 3}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="ui-monospace, monospace"
                      fill={L.hex}
                      animate={{
                        fillOpacity: on ? 0.95 : dim ? 0.2 : 0.7,
                      }}
                      transition={{ duration: dur }}
                    >
                      {c.name}
                    </motion.text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.06)_50%)] bg-[length:100%_4px] opacity-30" />
    </FrankenContainer>
  );
}
