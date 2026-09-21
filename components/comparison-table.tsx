"use client";

import { motion } from "framer-motion";
import { comparisonData } from "@/lib/content";
import { cn } from "@/lib/utils";
import { FrankenContainer } from "./franken-elements";
import FrankenGlitch from "./franken-glitch";

const ENGINES = ["FrankenSQLite", "C SQLite", "libSQL", "DuckDB"] as const;

function statusStyle(value: string) {
  const isPositive = [
    "First-class",
    "Enforced",
    "Built-in",
    "Yes",
    "Page-level",
    "Row-level",
    "Native",
    "20+ years",
    "Mature",
  ].includes(value);
  const isPartial = [
    "Enhanced WAL",
    "Extended WAL",
    "Extended",
    "WAL-only",
    "Growing",
    "Early",
    "Basic",
  ].includes(value);
  const isNegative = ["Manual", "No", "Single writer"].includes(value);
  const isNA = value.startsWith("N/A");
  return { isPositive, isPartial, isNegative, isNA };
}

function StatusIcon({ value }: { value: string }) {
  const { isPositive, isNegative, isPartial, isNA } = statusStyle(value);
  return (
    <>
      {isPositive && <span className="mr-1.5 shadow-[0_0_8px_#14b8a6]">&#10003;</span>}
      {isNegative && <span className="mr-1.5">&#10005;</span>}
      {isPartial && <span className="mr-1.5">&#9888;</span>}
      {isNA && <span className="mr-1.5">&#8212;</span>}
    </>
  );
}

function statusColor(value: string) {
  const { isPositive, isPartial, isNegative, isNA } = statusStyle(value);
  return cn(
    "text-sm font-medium",
    isPositive && "text-teal-400",
    isPartial && "text-yellow-400/80",
    isNegative && "text-slate-500",
    isNA && "text-slate-600",
  );
}

/* Desktop table cell */
function StatusCell({ value }: { value: string }) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-3", statusColor(value))}>
      <StatusIcon value={value} />
      {value}
    </td>
  );
}

/* Mobile card for a single feature row */
function MobileCard({ row }: { row: (typeof comparisonData)[number] }) {
  const values = [row.frankensqlite, row.csqlite, row.libsql, row.duckdb];
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-sm font-bold text-white mb-3">{row.feature}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {ENGINES.map((engine, i) => (
          <div key={engine} className="flex flex-col">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-0.5",
                i === 0 ? "text-teal-400" : "text-slate-500",
              )}
            >
              {engine}
            </span>
            <span className={statusColor(values[i])}>
              <StatusIcon value={values[i]} />
              {values[i]}
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
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-teal-400">
                <FrankenGlitch trigger="hover" intensity="low">
                  FrankenSQLite
                </FrankenGlitch>
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                C SQLite
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                libSQL
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                DuckDB
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comparisonData.map((row) => (
              <motion.tr
                key={row.feature}
                whileHover={{ backgroundColor: "rgba(20, 184, 166, 0.05)" }}
                className="transition-colors group"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  <FrankenGlitch trigger="hover" intensity="low" className="w-full">
                    {row.feature}
                  </FrankenGlitch>
                </td>
                <StatusCell value={row.frankensqlite} />
                <StatusCell value={row.csqlite} />
                <StatusCell value={row.libsql} />
                <StatusCell value={row.duckdb} />
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
    </FrankenContainer>
  );
}
