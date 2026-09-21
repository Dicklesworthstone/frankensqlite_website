"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import type React from "react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export function Magnetic({
  children,
  strength = 0.2,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const { clientX, clientY } = e;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      x.set((clientX - (left + width / 2)) * strength);
      y.set((clientY - (top + height / 2)) * strength);
    },
    [strength, x, y],
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
}

export function BorderBeam({ className }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] ${className ?? ""}`.trim()}
    >
      <div className="absolute w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(20,184,166,0.1)_180deg,transparent_360deg)] animate-border-beam" />
    </div>
  );
}

const noop = () => () => {};

export function Portal({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!isClient) return null;
  return createPortal(children, document.body);
}
