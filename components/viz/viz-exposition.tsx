"use client";

import { Info, PlayCircle, Zap } from "lucide-react";
import type { ReactNode } from "react";

export function VizExposition({
  whatItIs,
  howToUse,
  whyItMatters,
}: {
  whatItIs: ReactNode;
  howToUse: ReactNode;
  whyItMatters: ReactNode;
}) {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-3 border-t border-white/10 pt-8">
      <div className="space-y-3 bg-white/[0.02] rounded-xl p-5 border border-white/5 shadow-sm">
        <div className="flex items-center gap-2 text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]">
          <Info className="w-4 h-4" />
          <h4 className="text-[11px] font-black uppercase tracking-widest">What You Are Seeing</h4>
        </div>
        <div className="text-[13px] text-slate-300 leading-relaxed font-medium space-y-4">
          {whatItIs}
        </div>
      </div>

      <div className="space-y-3 bg-white/[0.02] rounded-xl p-5 border border-white/5 shadow-sm">
        <div className="flex items-center gap-2 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
          <PlayCircle className="w-4 h-4" />
          <h4 className="text-[11px] font-black uppercase tracking-widest">What To Try</h4>
        </div>
        <div className="text-[13px] text-slate-300 leading-relaxed font-medium space-y-4">
          {howToUse}
        </div>
      </div>

      <div className="space-y-3 bg-white/[0.02] rounded-xl p-5 border border-white/5 shadow-sm">
        <div className="flex items-center gap-2 text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]">
          <Zap className="w-4 h-4" />
          <h4 className="text-[11px] font-black uppercase tracking-widest">Why It Matters</h4>
        </div>
        <div className="text-[13px] text-slate-300 leading-relaxed font-medium space-y-4">
          {whyItMatters}
        </div>
      </div>
    </div>
  );
}
