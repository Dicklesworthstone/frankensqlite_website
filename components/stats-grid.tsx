"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import type { Stat } from "@/lib/content";
import { FrankenBolt, FrankenContainer, NeuralPulse } from "./franken-elements";
import FrankenGlitch from "./franken-glitch";

function parseStatValue(value: string): { number: number; suffix: string; isAnimatable: boolean } {
  const match = value.match(/^([0-9,.]+)(K|M|B)?(\+)?$/i);
  if (!match) return { number: 0, suffix: value, isAnimatable: false };
  const [, numStr, magnitude, plus] = match;
  const num = parseFloat(numStr.replace(/,/g, ""));
  return { number: num, suffix: `${magnitude || ""}${plus || ""}`, isAnimatable: true };
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  const containerRef = useRef<HTMLDListElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const parsedStats = useMemo(
    () => stats.map((stat) => ({ stat, parsed: parseStatValue(stat.value) })),
    [stats],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") {
      const hydrationId = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(hydrationId);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <FrankenContainer withPulse={true} className="overflow-hidden border-teal-500/10">
      <dl
        ref={containerRef}
        className="grid gap-px overflow-hidden text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4 bg-white/5"
      >
        {parsedStats.map(({ stat, parsed }, index) => (
          <div
            key={stat.label}
            className="group relative bg-[#020a05]/80 px-6 py-10 backdrop-blur transition-all duration-500 hover:bg-[#020a05]/40"
          >
            <NeuralPulse className="opacity-0 group-hover:opacity-40 transition-opacity" />
            <div
              className="absolute inset-x-0 top-0 h-px origin-center scale-x-0 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-400 transition-transform duration-500 group-hover:scale-x-100"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <FrankenBolt className="absolute top-2 right-2 opacity-10 group-hover:opacity-100 transition-opacity scale-75" />
            <FrankenBolt className="absolute bottom-2 left-2 opacity-10 group-hover:opacity-100 transition-opacity scale-75" />
            <dt className="relative z-10">
              <FrankenGlitch trigger="hover" intensity="low">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 transition-colors group-hover:text-teal-400/70">
                  {stat.label}
                </span>
              </FrankenGlitch>
            </dt>
            <dd className="relative z-10 mt-4 text-4xl font-black tracking-tight text-white transition-[filter] duration-500 group-hover:drop-shadow-[0_0_15px_rgba(20,184,166,0.5)] sm:text-5xl tabular-nums">
              {parsed.isAnimatable ? (
                <AnimatedNumber
                  value={parsed.number}
                  suffix={parsed.suffix}
                  duration={2000 + index * 200}
                  isVisible={isVisible}
                />
              ) : (
                stat.value
              )}
            </dd>
            {stat.helper && (
              <p className="relative z-10 mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 leading-relaxed group-hover:text-slate-400 transition-colors">
                {stat.helper}
              </p>
            )}
          </div>
        ))}
      </dl>
    </FrankenContainer>
  );
}
