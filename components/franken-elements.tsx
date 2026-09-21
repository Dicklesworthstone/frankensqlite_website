"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function FrankenBolt({
  className,
  color = "#2dd4bf",
  baseScale = 1,
}: {
  className?: string;
  color?: string;
  baseScale?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimationControls();

  useEffect(() => {
    if (isHovered) {
      controls.start({
        opacity: [0, 1, 0.5, 1, 0],
        pathLength: [0, 1],
        transition: {
          duration: 0.2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        },
      });
    } else {
      controls.stop();
      controls.set({ opacity: 0 });
    }
  }, [isHovered, controls]);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ scale: baseScale }}
      animate={{ scale: baseScale }}
      whileHover={{ scale: baseScale * 1.15 }}
      className={cn(
        "group relative h-3.5 w-3.5 rounded-full bg-gradient-to-br from-slate-700 via-slate-900 to-black border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_1px_3px_rgba(0,0,0,0.6)] flex items-center justify-center",
        className,
      )}
    >
      <div className="h-[60%] w-[1.5px] bg-slate-800 rotate-45 absolute" />
      <div className="h-[60%] w-[1.5px] bg-slate-800 -rotate-45 absolute" />
      <svg
        className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none overflow-visible"
        viewBox="0 0 20 20"
      >
        <motion.path
          d="M 10,2 Q 13,5 10,10 T 10,18"
          stroke={color}
          strokeWidth="0.75"
          fill="none"
          animate={controls}
          initial={{ opacity: 0 }}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
        <motion.path
          d="M 2,10 Q 5,13 10,10 T 18,10"
          stroke={color}
          strokeWidth="0.75"
          fill="none"
          animate={controls}
          initial={{ opacity: 0 }}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
    </motion.div>
  );
}

export function FrankenStitch({
  className,
  orientation = "horizontal",
  color = "currentColor",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
  color?: string;
}) {
  const stitchVariants = {
    initial: { scale: 1, opacity: 0.35 },
    hover: {
      scale: 1.05,
      opacity: 0.7,
      transition: { type: "spring" as const, stiffness: 400, damping: 15 },
    },
  };

  if (orientation === "horizontal") {
    return (
      <motion.svg
        width="100%"
        height="12"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        className={cn("pointer-events-none cursor-default", className)}
        aria-hidden="true"
        initial="initial"
        whileHover="hover"
      >
        <motion.path
          variants={stitchVariants}
          d="M5 6 L15 6 M10 1 L10 11 M25 6 L35 6 M30 1 L30 11 M45 6 L55 6 M50 1 L50 11 M65 6 L75 6 M70 1 L70 11 M85 6 L95 6 M90 1 L90 11"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.svg>
    );
  }
  return (
    <motion.svg
      width="12"
      height="100%"
      viewBox="0 0 12 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none cursor-default", className)}
      aria-hidden="true"
      initial="initial"
      whileHover="hover"
    >
      <motion.path
        variants={stitchVariants}
        d="M6 5 L6 15 M1 10 L11 10 M6 25 L6 35 M1 30 L11 30 M6 45 L6 55 M1 50 L11 50 M6 65 L6 75 M1 70 L11 70 M6 85 L6 95 M1 90 L11 90"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

export function NeuralPulse({
  className,
  color = "#2dd4bf",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]",
        className,
      )}
      style={{ ["--pulse-color" as string]: color }}
    >
      <motion.div
        initial={{ top: 0, left: 0, opacity: 0 }}
        animate={{
          top: ["0%", "0%", "100%", "100%", "0%"],
          left: ["0%", "100%", "100%", "0%", "0%"],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
        className="absolute h-[1.5px] w-12 bg-gradient-to-r from-transparent via-[var(--pulse-color)] to-transparent blur-[2px] z-0"
      />
      <motion.div
        initial={{ top: 0, left: 0, opacity: 0 }}
        animate={{
          top: ["0%", "0%", "100%", "100%", "0%"],
          left: ["0%", "100%", "100%", "0%", "0%"],
          opacity: [0, 0.8, 0.8, 0.8, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.25, 0.5, 0.75, 1],
          delay: 2,
        }}
        className="absolute w-[1.5px] h-12 bg-gradient-to-b from-transparent via-[var(--pulse-color)] to-transparent blur-[2px] z-0"
      />
    </div>
  );
}

export function FrankenContainer({
  children,
  className,
  withBolts = true,
  withStitches = true,
  withPulse = false,
  accentColor = "#2dd4bf",
}: {
  children: React.ReactNode;
  className?: string;
  withBolts?: boolean;
  withStitches?: boolean;
  withPulse?: boolean;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "relative group/container rounded-2xl border border-white/5 bg-black/40",
        className,
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M10 0v5M10 15v10M10 35v5M30 0v5M30 15v10M30 35v5M0 10h5M15 10h10M35 10h5M0 30h5M15 30h10M35 30h5' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "80px 80px",
          }}
        />
        {withPulse && (
          <NeuralPulse
            color={accentColor}
            className="opacity-0 group-hover/container:opacity-100 transition-opacity duration-700"
          />
        )}
      </div>
      {withBolts && (
        <>
          <FrankenBolt color={accentColor} className="absolute -left-1.5 -top-1.5 z-30" />
          <FrankenBolt color={accentColor} className="absolute -right-1.5 -top-1.5 z-30" />
          <FrankenBolt color={accentColor} className="absolute -left-1.5 -bottom-1.5 z-30" />
          <FrankenBolt color={accentColor} className="absolute -right-1.5 -bottom-1.5 z-30" />
        </>
      )}
      {withStitches && (
        <>
          <FrankenStitch
            color={accentColor}
            className="absolute top-0 left-1/4 right-1/4 w-1/2 opacity-20 group-hover/container:opacity-60 transition-opacity z-20"
          />
          <FrankenStitch
            color={accentColor}
            className="absolute bottom-0 left-1/4 right-1/4 w-1/2 rotate-180 opacity-20 group-hover/container:opacity-60 transition-opacity z-20"
          />
          <FrankenStitch
            color={accentColor}
            orientation="vertical"
            className="absolute left-0 top-1/4 bottom-1/4 h-1/2 opacity-10 group-hover/container:opacity-40 transition-opacity z-20"
          />
          <FrankenStitch
            color={accentColor}
            orientation="vertical"
            className="absolute right-0 top-1/4 bottom-1/4 h-1/2 rotate-180 opacity-10 group-hover/container:opacity-40 transition-opacity z-20"
          />
        </>
      )}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
