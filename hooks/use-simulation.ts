"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSimulationOptions {
  /** Called on each animation frame with the elapsed delta in ms */
  onTick: (deltaMs: number) => void;
  /** Target ticks per second (0 = requestAnimationFrame native rate) */
  tickRate?: number;
  /** Start paused */
  startPaused?: boolean;
}

interface UseSimulationReturn {
  /** Whether the simulation is currently running */
  isRunning: boolean;
  /** Current simulation speed multiplier */
  speed: number;
  /** Total elapsed simulation time in ms */
  elapsed: number;
  /** Start or resume the simulation */
  play: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Toggle between play and pause */
  toggle: () => void;
  /** Reset elapsed time to zero */
  reset: () => void;
  /** Set simulation speed multiplier (1 = normal, 2 = double, 0.5 = half) */
  setSpeed: (speed: number) => void;
}

/**
 * Manages animation frames for running interactive simulations.
 * Provides play/pause/reset/speed controls for viz components
 * that need continuous animation (e.g., MVCC race, pipeline flythrough).
 *
 * Respects prefers-reduced-motion — if detected, the simulation
 * runs in "instant" mode where onTick is called once with a large delta.
 */
export function useSimulation({
  onTick,
  tickRate = 0,
  startPaused = true,
}: UseSimulationOptions): UseSimulationReturn {
  const [isRunning, setIsRunning] = useState(!startPaused);
  const [speed, setSpeedState] = useState(1);
  const [elapsed, setElapsed] = useState(0);

  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const speedRef = useRef(1);
  const onTickRef = useRef(onTick);
  const tickIntervalMs = tickRate > 0 ? 1000 / tickRate : 0;

  // Keep callback ref current without re-triggering effect
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Use a ref for the RAF loop to avoid self-referencing useCallback
  const loopRef = useRef<(now: number) => void>(undefined);
  useEffect(() => {
    loopRef.current = (now: number) => {
      if (lastTickRef.current === 0) {
        lastTickRef.current = now;
      }

      const rawDelta = now - lastTickRef.current;

      if (tickIntervalMs > 0 && rawDelta < tickIntervalMs) {
        rafRef.current = requestAnimationFrame((t) => loopRef.current?.(t));
        return;
      }

      lastTickRef.current = now;
      const scaledDelta = rawDelta * speedRef.current;
      elapsedRef.current += scaledDelta;
      setElapsed(elapsedRef.current);
      onTickRef.current(scaledDelta);

      rafRef.current = requestAnimationFrame((t) => loopRef.current?.(t));
    };
  });

  useEffect(() => {
    if (isRunning) {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame((t) => loopRef.current?.(t));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning]);

  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const toggle = useCallback(() => setIsRunning((r) => !r), []);
  const reset = useCallback(() => {
    elapsedRef.current = 0;
    setElapsed(0);
    lastTickRef.current = 0;
  }, []);
  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeedState(s);
  }, []);

  return { isRunning, speed, elapsed, play, pause, toggle, reset, setSpeed };
}
