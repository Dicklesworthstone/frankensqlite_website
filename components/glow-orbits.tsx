"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export default function GlowOrbits() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { ref: observerRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0,
    triggerOnce: false,
  });
  const prefersReducedMotion = usePrefersReducedMotion();
  // -1 means "no pointer position yet" and maps to zero offset, so the first
  // client render matches the server-rendered HTML (no hydration mismatch).
  const mouseX = useMotionValue(-1);
  const mouseY = useMotionValue(-1);
  const springX = useSpring(mouseX, { damping: 50, stiffness: 100 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 100 });
  const parallaxX = useTransform(springX, (val) =>
    typeof window === "undefined" || val < 0 ? 0 : (val / window.innerWidth - 0.5) * -60,
  );
  const parallaxY = useTransform(springY, (val) =>
    typeof window === "undefined" || val < 0 ? 0 : (val / window.innerHeight - 0.5) * -60,
  );
  const spectrum = [
    "#38bdf8",
    "#a78bfa",
    "#f472b6",
    "#ef4444",
    "#fb923c",
    "#fbbf24",
    "#14b8a6",
    "#22d3ee",
  ];

  useEffect(() => {
    if (prefersReducedMotion || !isIntersecting) return undefined;
    // Start from the viewport centre (zero offset) without animating.
    if (mouseX.get() < 0) {
      mouseX.jump(window.innerWidth / 2);
      mouseY.jump(window.innerHeight / 2);
      springX.jump(window.innerWidth / 2);
      springY.jump(window.innerHeight / 2);
    }
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, springX, springY, isIntersecting, prefersReducedMotion]);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion || !isIntersecting) return;
    const rings = rootRef.current.querySelectorAll<HTMLElement>(".glow-ring");
    if (rings.length === 0) return;
    const animations: Animation[] = [];
    rings.forEach((ring, i) => {
      animations.push(
        ring.animate(
          [
            { transform: "rotate(0deg) scale(1)", opacity: 0.1 },
            { transform: "rotate(180deg) scale(1.15)", opacity: 0.25 },
            { transform: "rotate(360deg) scale(1)", opacity: 0.1 },
          ],
          { duration: 30000 + i * 8000, iterations: Infinity, easing: "ease-in-out" },
        ),
      );
    });
    return () => animations.forEach((a) => a.cancel());
  }, [prefersReducedMotion, isIntersecting]);

  return (
    <motion.div
      ref={(node) => {
        rootRef.current = node as HTMLDivElement;
        observerRef.current = node as HTMLDivElement;
      }}
      style={prefersReducedMotion ? undefined : { x: parallaxX, y: parallaxY }}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="glow-ring absolute -top-[20%] -left-[10%] h-[60%] w-[60%] rounded-full blur-[120px]"
        style={{
          background: `radial-gradient(circle at center, ${spectrum[0]}33, transparent 70%)`,
        }}
      />
      <div
        className="glow-ring absolute -bottom-[20%] -right-[10%] h-[70%] w-[70%] rounded-full blur-[140px]"
        style={{
          background: `radial-gradient(circle at center, ${spectrum[2]}22, transparent 70%)`,
        }}
      />
      <div
        className="glow-ring absolute top-1/2 left-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
        style={{
          background: `radial-gradient(circle at center, ${spectrum[6]}11, transparent 70%)`,
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-teal-500/20 blur-[100px]"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        className="absolute bottom-1/4 left-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-[110px]"
      />
    </motion.div>
  );
}
