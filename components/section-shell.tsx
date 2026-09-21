"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Blocks,
  Bug,
  Clock,
  Cpu,
  Eye,
  FileText,
  GitCompare,
  Globe,
  HardDrive,
  Keyboard,
  Layers,
  Monitor,
  Package,
  Play,
  Rocket,
  Shield,
  Skull,
  Sparkles,
  Terminal,
  Twitter,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FrankenStitch } from "./franken-elements";
import FrankenGlitch from "./franken-glitch";

const sectionIcons = {
  barChart3: BarChart3,
  blocks: Blocks,
  bug: Bug,
  clock: Clock,
  cpu: Cpu,
  eye: Eye,
  fileText: FileText,
  gitCompare: GitCompare,
  globe: Globe,
  hardDrive: HardDrive,
  keyboard: Keyboard,
  layers: Layers,
  monitor: Monitor,
  package: Package,
  play: Play,
  rocket: Rocket,
  shield: Shield,
  skull: Skull,
  sparkles: Sparkles,
  terminal: Terminal,
  twitter: Twitter,
  zap: Zap,
  activity: Activity,
} as const;
type SectionIcon = keyof typeof sectionIcons;

type Props = {
  id?: string;
  icon?: SectionIcon;
  eyebrow?: string;
  title: string;
  kicker?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 1 | 2;
  forceReveal?: boolean;
};

export default function SectionShell({
  id,
  icon,
  eyebrow,
  title,
  kicker,
  children,
  className,
  headingLevel = 2,
  forceReveal = false,
}: Props) {
  const Icon = icon ? sectionIcons[icon] : undefined;
  const HeadingTag = `h${headingLevel}` as const;
  const prefersReducedMotion = useReducedMotion();
  const skipAnim = forceReveal || prefersReducedMotion;
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      data-section
      id={id}
      aria-labelledby={headingId}
      className={cn("relative mx-auto max-w-7xl px-6 py-16 md:py-32 lg:py-48", className)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-32 space-y-10">
          <motion.div
            initial={skipAnim ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            whileInView={skipAnim ? undefined : { opacity: 1, x: 0 }}
            viewport={skipAnim ? undefined : { once: true, amount: 0.05 }}
            transition={skipAnim ? { duration: 0 } : { duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
          >
            {eyebrow && (
              <div className="inline-flex items-center gap-3 mb-8">
                <div className="h-px w-8 bg-teal-500/40" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
                  {eyebrow}
                </span>
              </div>
            )}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div
                  data-magnetic="true"
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-400"
                >
                  {Icon ? <Icon className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                </div>
                <FrankenGlitch trigger="hover" intensity="low">
                  <HeadingTag
                    id={headingId}
                    className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight"
                  >
                    {title}
                  </HeadingTag>
                </FrankenGlitch>
              </div>
              {kicker && (
                <div className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed">
                  {kicker}
                </div>
              )}
            </div>
          </motion.div>
          <div className="opacity-20 pointer-events-none">
            <FrankenStitch orientation="vertical" className="h-24 md:h-32" />
          </div>
        </div>
        <div className="lg:col-span-8">
          <motion.div
            initial={skipAnim ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            whileInView={skipAnim ? undefined : { opacity: 1, y: 0 }}
            viewport={skipAnim ? undefined : { once: true, amount: 0.05 }}
            transition={
              skipAnim ? { duration: 0 } : { duration: 1, ease: [0.19, 1, 0.22, 1], delay: 0.2 }
            }
          >
            {children}
          </motion.div>
        </div>
      </div>
      <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
    </section>
  );
}
