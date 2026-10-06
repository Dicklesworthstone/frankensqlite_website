"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

/**
 * Hydration-safe replacement for framer-motion's `useReducedMotion`.
 *
 * framer-motion reads the media query during the first client render, so for
 * visitors who prefer reduced motion the client tree differs from the
 * server-rendered HTML and React throws away the SSR output (error #418).
 * `useSyncExternalStore` renders with the server snapshot (`false`) while
 * hydrating and switches to the real preference right after.
 *
 * Use this in components that are server-rendered. Components loaded with
 * `dynamic(..., { ssr: false })` can keep using `useReducedMotion`.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
