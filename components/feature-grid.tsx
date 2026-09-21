"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart,
  Blocks,
  Cpu,
  KeyRound,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Terminal,
} from "lucide-react";
import { features } from "@/lib/content";

const ICONS: Record<string, React.ElementType> = {
  cpu: Cpu,
  shield: Shield,
  blocks: Blocks,
  lock: Lock,
  terminal: Terminal,
  sparkles: Sparkles,
  activity: Activity,
  layers: Layers,
  keyRound: KeyRound,
  barChart: BarChart,
};

export default function FeatureGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, i) => {
        const Icon = ICONS[feature.icon] || Sparkles;
        return (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
            className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-teal-500/30 hover:bg-white/[0.04]"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white tracking-tight">{feature.title}</h3>
              <div className="text-sm leading-relaxed text-slate-400 font-medium">
                {feature.description}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
