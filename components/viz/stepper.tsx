"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSite } from "@/lib/site-state";

export interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  /** Auto-play interval in ms (0 = disabled) */
  autoPlayInterval?: number;
  /** Compact mode for smaller viewports */
  compact?: boolean;
}

/**
 * Reusable step-through controller for temporal visualizations.
 * Provides back/next navigation, step indicator, phase labels,
 * and optional auto-play with pause/resume.
 *
 * Inspired by the Bakery DoorwayRaceViz temporal scrubber pattern.
 */
export default function Stepper({
  steps,
  currentStep,
  onStepChange,
  autoPlayInterval = 0,
  compact = false,
}: StepperProps) {
  const { playSfx } = useSite();
  const prefersReducedMotion = useReducedMotion();
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = steps.length;

  const goNext = useCallback(() => {
    playSfx("click");
    const next = Math.min(currentStep + 1, total - 1);
    onStepChange(next);
    if (next >= total - 1) setIsPlaying(false);
  }, [currentStep, total, onStepChange, playSfx]);

  const goPrev = useCallback(() => {
    playSfx("click");
    onStepChange(Math.max(currentStep - 1, 0));
  }, [currentStep, onStepChange, playSfx]);

  const togglePlay = useCallback(() => {
    playSfx("click");
    setIsPlaying((prev) => !prev);
  }, [playSfx]);

  // Auto-play logic — uses currentStep from props via ref to avoid stale closures
  const stepRef = useRef(currentStep);
  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    if (isPlaying && autoPlayInterval > 0) {
      intervalRef.current = setInterval(() => {
        const next = stepRef.current + 1;
        if (next >= total) {
          setIsPlaying(false);
        } else {
          onStepChange(next);
        }
      }, autoPlayInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, autoPlayInterval, total, onStepChange]);

  const step = steps[currentStep];

  return (
    <div className="flex flex-col gap-3">
      {/* Step label & description */}
      <div className="min-h-[5.5rem] md:min-h-[4rem] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={prefersReducedMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="absolute inset-0"
          >
            <div className="text-xs font-black uppercase tracking-[0.2em] text-teal-500 mb-1">
              Step {currentStep + 1} of {total}
            </div>
            <div className="text-sm font-bold text-white">{step?.label}</div>
            {step?.description && !compact && (
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">{step.description}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 md:h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-teal-500 rounded-full"
          animate={{ width: `${((currentStep + 1) / total) * 100}%` }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          className="flex items-center justify-center h-11 w-11 rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
          aria-label="Previous step"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {autoPlayInterval > 0 && (
          <button
            onClick={togglePlay}
            className="flex items-center justify-center h-11 w-11 rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-teal-500/30 focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        )}

        <button
          onClick={goNext}
          disabled={currentStep >= total - 1}
          className="flex items-center justify-center h-11 w-11 rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10 hover:border-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none"
          aria-label="Next step"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Step dots */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-0.5 mx-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                playSfx("click");
                onStepChange(i);
                if (i >= total - 1) setIsPlaying(false);
              }}
              className="relative flex items-center justify-center min-h-[44px] min-w-[44px] p-2 focus-visible:ring-2 focus-visible:ring-teal-500/50 outline-none rounded-lg"
              aria-label={`Go to step ${i + 1}`}
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  i === currentStep
                    ? "w-6 bg-teal-500"
                    : i < currentStep
                      ? "w-2 bg-teal-500/40"
                      : "w-2 bg-white/10"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
