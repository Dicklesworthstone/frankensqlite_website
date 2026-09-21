"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function FrankenEye({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [proximity, setProximity] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(false);

  const updateRect = useCallback(() => {
    if (eyeRef.current) rectRef.current = eyeRef.current.getBoundingClientRect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    const el = eyeRef.current;
    if (!el) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisibleRef.current || frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        if (!rectRef.current) {
          frameRef.current = null;
          return;
        }
        const rect = rectRef.current;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.hypot(deltaX, deltaY);
        const angle = Math.atan2(deltaY, deltaX);
        const moveDist = Math.min(rect.width / 4, distance / 15);
        setMousePos({ x: Math.cos(angle) * moveDist, y: Math.sin(angle) * moveDist });
        setProximity(Math.max(0, 1 - distance / 400));
        frameRef.current = null;
      });
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) updateRect();
      },
      { threshold: 0 },
    );
    observer.observe(el);
    updateRect();
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [updateRect, prefersReducedMotion]);

  const isBlinkingRef = useRef(false);
  useEffect(() => {
    isBlinkingRef.current = isBlinking;
  }, [isBlinking]);

  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    const blinkInterval = setInterval(() => {
      if (isVisibleRef.current && Math.random() > 0.8 && !isBlinkingRef.current) {
        setIsBlinking(true);
        if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = setTimeout(() => setIsBlinking(false), 120);
      }
    }, 2500);
    return () => {
      clearInterval(blinkInterval);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={eyeRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative h-12 w-12 rounded-full bg-white border-2 border-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] overflow-hidden flex items-center justify-center",
        prefersReducedMotion ? "cursor-auto" : "cursor-none",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_#fff_0%,_#e2e8f0_100%)]" />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        viewBox="0 0 100 100"
      >
        <motion.path
          d="M 15 15 Q 30 35 45 45"
          stroke="#ef4444"
          strokeWidth="0.8"
          fill="none"
          animate={{ opacity: proximity }}
        />
        <motion.path
          d="M 85 15 Q 70 35 55 45"
          stroke="#ef4444"
          strokeWidth="0.8"
          fill="none"
          animate={{ opacity: proximity }}
        />
        <motion.path
          d="M 15 85 Q 30 65 45 55"
          stroke="#ef4444"
          strokeWidth="0.8"
          fill="none"
          animate={{ opacity: proximity }}
        />
        <motion.path
          d="M 85 85 Q 70 65 55 55"
          stroke="#ef4444"
          strokeWidth="0.8"
          fill="none"
          animate={{ opacity: proximity }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="relative h-6 w-6 rounded-full bg-teal-500 border border-teal-700 flex items-center justify-center shadow-[inset_0_0_10px_rgba(0,0,0,0.3)]"
          style={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
        >
          <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,_transparent_0deg_10deg,_rgba(0,0,0,0.1)_10deg_20deg)] opacity-40 rounded-full" />
          <motion.div
            className="h-3 w-3 rounded-full bg-slate-950"
            animate={{
              scale: isHovered ? 1.25 : 1,
              backgroundColor: isHovered ? "#000" : "#020617",
            }}
          />
          <div className="absolute top-1 left-1 h-1.5 w-1.5 rounded-full bg-white/60" />
        </motion.div>
      </div>
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none flex flex-col"
        initial={false}
      >
        <motion.div
          className="w-full flex-1 bg-slate-950 origin-top"
          animate={{ scaleY: isBlinking ? 1 : 0 }}
          transition={{ duration: 0.1, ease: "easeInOut" }}
        />
        <motion.div
          className="w-full flex-1 bg-slate-950 origin-bottom"
          animate={{ scaleY: isBlinking ? 1 : 0 }}
          transition={{ duration: 0.1, ease: "easeInOut" }}
        />
      </motion.div>
      <div className="absolute inset-0 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] pointer-events-none rounded-full z-30" />
    </div>
  );
}
