"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bug, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

export default function NewtypePattern() {
  const [activeTab, setActiveTab] = useState<"c" | "rust">("c");

  return (
    <VizContainer
      title="Zero-Cost Type Safety"
      description="In C, a page number and a transaction ID are both just 32-bit integers. Passing a TxnId to a function expecting a PageNumber causes silent corruption. In FrankenSQLite, the compiler prevents this via the 'Newtype' pattern."
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("c")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "c" ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-transparent text-slate-500 hover:bg-white/5 border border-transparent"}`}
          >
            C (Legacy SQLite)
          </button>
          <button
            onClick={() => setActiveTab("rust")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "rust" ? "bg-teal-500/20 text-teal-400 border border-teal-500/50" : "bg-transparent text-slate-500 hover:bg-white/5 border border-transparent"}`}
          >
            Rust (FrankenSQLite)
          </button>
        </div>

        {/* Code Visualization */}
        <div className="flex-1 bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-[10px] sm:text-xs overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === "c" ? (
              <motion.div
                key="c"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <span className="text-purple-400">typedef</span>{" "}
                  <span className="text-teal-300">uint32_t</span>{" "}
                  <span className="text-blue-300">Pgno</span>;
                  <br />
                  <span className="text-purple-400">typedef</span>{" "}
                  <span className="text-teal-300">uint32_t</span>{" "}
                  <span className="text-blue-300">TxnId</span>;
                </div>

                <div>
                  <span className="text-slate-500">{"// Function expects a Page Number"}</span>
                  <br />
                  <span className="text-teal-300">void</span>{" "}
                  <span className="text-amber-300">read_page</span>(
                  <span className="text-blue-300">Pgno</span> page_num) {"{"} ... {"}"}
                </div>

                <div className="relative mt-2">
                  <span className="text-slate-500">
                    {"// Developer accidentally passes a TxnId"}
                  </span>
                  <br />
                  <span className="text-blue-300">TxnId</span> current_txn ={" "}
                  <span className="text-amber-500">10485</span>;
                  <br />
                  <span className="text-amber-300">read_page</span>(current_txn);
                  {/* Exploding bug */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -right-2 top-0 bg-red-500/20 border border-red-500/50 text-red-400 p-2 rounded flex items-center gap-2"
                  >
                    <Bug className="w-4 h-4" />
                    <span>Compiles successfully. Silently reads wrong page.</span>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="rust"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <span className="text-purple-400">pub struct</span>{" "}
                  <span className="text-amber-300">PageNumber</span>(
                  <span className="text-teal-300">u32</span>);
                  <br />
                  <span className="text-purple-400">pub struct</span>{" "}
                  <span className="text-amber-300">TxnId</span>(
                  <span className="text-teal-300">u32</span>);
                </div>

                <div>
                  <span className="text-slate-500">
                    {"// Function strongly typed to PageNumber wrapper"}
                  </span>
                  <br />
                  <span className="text-purple-400">fn</span>{" "}
                  <span className="text-blue-300">read_page</span>(page_num:{" "}
                  <span className="text-amber-300">PageNumber</span>) {"{"} ... {"}"}
                </div>

                <div className="relative mt-2">
                  <span className="text-slate-500">
                    {"// Developer accidentally passes a TxnId"}
                  </span>
                  <br />
                  <span className="text-purple-400">let</span> current_txn ={" "}
                  <span className="text-amber-300">TxnId</span>(
                  <span className="text-teal-300">10485</span>);
                  <br />
                  <span className="line-through decoration-red-500 decoration-2 text-slate-500">
                    <span className="text-blue-300">read_page</span>(current_txn);
                  </span>
                  {/* Compiler error */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -right-2 top-0 bg-teal-500/20 border border-teal-500/50 text-teal-300 p-2 rounded flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      Compiler Error [E0308]:
                    </div>
                    <div className="text-[9px] opacity-80 leading-tight">
                      expected struct `PageNumber`, found struct `TxnId`
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              You are looking at a side-by-side comparison of C (the language legacy SQLite is
              written in) and Rust (the language FrankenSQLite is written in).
            </p>
            <p>
              In C, developers often use <code>typedef</code> to give integers fancy names (like{" "}
              <code>Pgno</code> or <code>TxnId</code>), but the compiler still just sees them as
              generic 32-bit numbers.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click the <strong>C (Legacy SQLite)</strong> tab. Notice how passing a{" "}
              <code>TxnId</code> into a function that explicitly asks for a <code>Pgno</code>{" "}
              compiles perfectly. The program runs, but it silently reads the wrong page, corrupting
              your data.
            </p>
            <div>
              Now click the <strong>Rust (FrankenSQLite)</strong> tab. Rust uses the{" "}
              <FrankenJargon term="newtype-pattern">Newtype</FrankenJargon> pattern.{" "}
              <code>PageNumber</code> and <code>TxnId</code> are distinct, incompatible structs that
              happen to wrap an integer. When the developer makes the exact same mistake, the Rust
              compiler rejects it with an <code>E0308</code> error before the code even runs.
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              In a 100,000-line database engine, passing the wrong integer into the wrong function
              is a common source of bugs and notoriously difficult to trace. It typically results in
              silent data corruption or exploitable vulnerabilities.
            </div>
            <div>
              By enforcing strict <FrankenJargon term="newtype-pattern">Newtype</FrankenJargon>
              -based type boundaries and{" "}
              <FrankenJargon term="zero-unsafe">memory safety</FrankenJargon> at compile time,
              FrankenSQLite structurally eliminates entire categories of bugs that have plagued
              C-based databases for decades.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
