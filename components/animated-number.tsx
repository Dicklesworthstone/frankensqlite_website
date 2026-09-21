"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  isVisible?: boolean;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 2000,
  isVisible = true,
  decimals,
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion && !hasAnimated) {
      const hydrationId = setTimeout(() => {
        setCount(value);
        setHasAnimated(true);
      }, 0);
      return () => clearTimeout(hydrationId);
    }
    return undefined;
  }, [prefersReducedMotion, value, hasAnimated]);

  const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

  useEffect(() => {
    if (prefersReducedMotion || !isVisible || hasAnimated) return;
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - (startTimeRef.current ?? timestamp);
      const progress = Math.min(elapsed / duration, 1);
      setCount(easeOutExpo(progress) * value);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(value);
        setHasAnimated(true);
      }
    };
    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [isVisible, hasAnimated, value, duration, prefersReducedMotion]);

  let displayNumber: string;
  if (typeof decimals === "number") displayNumber = count.toFixed(decimals);
  else displayNumber = value % 1 === 0 ? Math.round(count).toString() : count.toFixed(1);
  if (hasAnimated || prefersReducedMotion) {
    displayNumber =
      typeof decimals === "number"
        ? value.toFixed(decimals)
        : value % 1 === 0
          ? value.toString()
          : value.toFixed(1);
  }
  const srValue =
    typeof decimals === "number"
      ? value.toFixed(decimals)
      : value % 1 === 0
        ? value.toString()
        : value.toFixed(1);

  return (
    <span className={className}>
      <span className="sr-only">
        {prefix}
        {srValue}
        {suffix}
      </span>
      <span className="tabular-nums" aria-hidden="true">
        {prefix}
        {displayNumber}
        {suffix}
      </span>
    </span>
  );
}
