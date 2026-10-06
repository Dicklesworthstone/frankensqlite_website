"use client";

import { motion } from "framer-motion";
import {
  type ComparisonCell,
  type ComparisonRow,
  comparisonData,
  comparisonEngines,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { FrankenContainer } from "./franken-elements";
import FrankenGlitch from "./franken-glitch";

const TONE_ICON: Record<ComparisonCell["tone"], string> = {
  yes: "✓",
  partial: "◐",
  no: "✕",
  na: "—",
};

function toneColor(tone: ComparisonCell["tone"]) {
  return cn(
    "text-sm font-medium",
    tone === "yes" && "text-teal-400",
    tone === "partial" && "text-amber-300/90",
    tone === "no" && "text-slate-500",
    tone === "na" && "text-slate-600",
  );
}

function CellContent({ cell }: { cell: ComparisonCell }) {
  return (
    <>
      <span className="mr-1.5" aria-hidden="true">
        {TONE_ICON[cell.tone]}
      </span>
      {cell.text}
    </>
  );
}

/* Mobile card for a single feature row */
function MobileCard({ row }: { row: ComparisonRow }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-sm font-bold text-white mb-1">{row.feature}</div>
      {row.note && <div className="text-xs text-slate-500 mb-3">{row.note}</div>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {comparisonEngines.map((engine, i) => (
          <div key={engine.key} className="flex flex-col">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                i === 0 ? "text-teal-400" : "text-slate-500",
              )}
            >
              {engine.label}
            </span>
            <span className={toneColor(row.cells[engine.key].tone)}>
              <CellContent cell={row.cells[engine.key]} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComparisonTable() {
  return (
    <FrankenContainer withPulse={true} className="overflow-hidden border-teal-500/10">
      {/* Desktop: full table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                Feature
              </th>
              {comparisonEngines.map((engine, i) => (
                <th
                  key={engine.key}
                  className={cn(
                    "px-4 py-4 text-xs font-bold uppercase tracking-widest",
                    i === 0 ? "text-teal-400" : "text-slate-500",
                  )}
                >
                  {i === 0 ? (
                    <FrankenGlitch trigger="hover" intensity="low">
                      {engine.label}
                    </FrankenGlitch>
                  ) : (
                    engine.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comparisonData.map((row) => (
              <motion.tr
                key={row.feature}
                whileHover={{ backgroundColor: "rgba(20, 184, 166, 0.05)" }}
                className="transition-colors group align-top"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {row.feature}
                  {row.note && (
                    <div className="mt-1 text-[11px] font-normal text-slate-500">{row.note}</div>
                  )}
                </td>
                {comparisonEngines.map((engine) => (
                  <td
                    key={engine.key}
                    className={cn("px-4 py-3", toneColor(row.cells[engine.key].tone))}
                  >
                    <CellContent cell={row.cells[engine.key]} />
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden flex flex-col gap-3 p-4">
        {comparisonData.map((row) => (
          <MobileCard key={row.feature} row={row} />
        ))}
      </div>

      <div className="border-t border-white/5 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        &#10003; yes &middot; &#9680; partial or opt-in &middot; &#10005; no. Other engines are
        described from their own public docs; FrankenSQLite entries describe the current default
        runtime, not the design target.
      </div>
    </FrankenContainer>
  );
}
