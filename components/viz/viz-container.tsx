"use client";

import { motion } from "framer-motion";
import React, { type ReactNode, useEffect, useState } from "react";
import { FrankenContainer } from "@/components/franken-elements";

interface VizContainerProps {
  children: ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Minimum height for the visualization area */
  minHeight?: number;
  /** Show a loading spinner until the viz signals it's ready */
  loading?: boolean;
  className?: string;
}

/**
 * Shared wrapper for all interactive visualizations.
 * Provides consistent styling (FrankenContainer), loading states,
 * reduced-motion fallbacks, and lazy-load boundaries.
 */
export default function VizContainer({
  children,
  title,
  description,
  minHeight = 400,
  loading = false,
  className = "",
}: VizContainerProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <FrankenContainer
      withPulse={!prefersReducedMotion}
      accentColor="#14b8a6"
      className={`overflow-hidden ${className}`}
    >
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg md:text-2xl font-black text-white tracking-tight">{title}</h3>
          {description && (
            <div className="mt-2 text-sm text-slate-400 leading-relaxed max-w-2xl">
              {description}
            </div>
          )}
        </div>

        {/* Visualization area */}
        <div
          className="relative rounded-xl border border-white/5 bg-black/30 shadow-[inset_0_0_40px_rgba(20,184,166,0.03)]"
          style={{ minHeight }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="h-8 w-8 rounded-full border-2 border-teal-500/30 border-t-teal-500"
              />
            </div>
          ) : (
            <div data-reduced-motion={prefersReducedMotion || undefined}>{children}</div>
          )}
        </div>
      </div>
    </FrankenContainer>
  );
}
