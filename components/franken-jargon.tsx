"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { getJargon } from "@/lib/franken-jargon";

interface FrankenJargonProps {
  term: string;
  children?: ReactNode;
  className?: string;
}

export function FrankenJargon({ term, children, className = "" }: FrankenJargonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const termKey = term.toLowerCase().replace(/[\s_]+/g, "-");
  const jargonData = getJargon(termKey);

  if (!jargonData) {
    return <>{children || term}</>;
  }

  const displayText = children || jargonData.term;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        onClick={handleClick}
        className={`relative inline cursor-help text-left font-semibold text-teal-300 decoration-[1.5px] underline-offset-[3px] decoration-teal-400/40 decoration-dotted hover:decoration-teal-400/80 hover:text-teal-200 transition-colors duration-150 focus:outline-none ${className}`}
        aria-label={`Learn about ${jargonData.term}`}
        aria-expanded={isOpen}
      >
        {displayText}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] w-[320px] sm:w-[360px] bottom-full left-1/2 -translate-x-1/2 mb-3 cursor-default"
          >
            <div className="rounded-xl border border-teal-500/20 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl relative before:absolute before:inset-x-0 before:top-0 before:h-1 before:rounded-t-xl before:bg-gradient-to-r before:from-teal-500/80 before:to-emerald-400/80">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                    <Info className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-white text-base leading-tight">
                    {jargonData.term}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-slate-300 font-medium">
                  {jargonData.short}
                </p>

                <div className="h-px w-full bg-white/10 my-2" />

                <p className="text-xs leading-relaxed text-slate-400">{jargonData.long}</p>

                {jargonData.analogy && (
                  <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-purple-400">
                      Think of it like...
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">{jargonData.analogy}</p>
                  </div>
                )}

                {jargonData.why && (
                  <div className="mt-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-teal-400">
                      Why it matters
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">{jargonData.why}</p>
                  </div>
                )}

                {jargonData.related && jargonData.related.length > 0 && (
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {jargonData.related.map((r) => (
                        <span
                          key={r}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
