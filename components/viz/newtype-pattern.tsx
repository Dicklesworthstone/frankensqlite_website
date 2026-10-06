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
      description="In C, a typedef is only an alias: a page number and a transaction ID are both plain integers to the compiler, so passing one where the other belongs compiles and reads the wrong page. FrankenSQLite wraps each in its own type (the newtype pattern), and the compiler rejects the mix-up."
      minHeight={400}
      status="live"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between gap-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("c")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "c" ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-transparent text-slate-500 hover:bg-white/5 border border-transparent"}`}
          >
            C (typedef aliases)
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
                  <span className="text-teal-300">uint64_t</span>{" "}
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
                    <span>Compiles. Silently reads the wrong page.</span>
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
                  <span className="text-slate-500">{"// crates/fsqlite-types"}</span>
                  <br />
                  <span className="text-purple-400">pub struct</span>{" "}
                  <span className="text-amber-300">PageNumber</span>(
                  <span className="text-teal-300">NonZeroU32</span>);
                  <br />
                  <span className="text-purple-400">pub struct</span>{" "}
                  <span className="text-amber-300">TxnId</span>(
                  <span className="text-teal-300">NonZeroU64</span>);
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
                  <span className="text-amber-300">TxnId</span>::
                  <span className="text-blue-300">new</span>(
                  <span className="text-teal-300">10485</span>)?;
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
                      mismatched types: expected `PageNumber`, found `TxnId`
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
              A side-by-side comparison of the same mistake in C and in Rust. The C tab is an
              illustration in the style of SQLite&apos;s source, which uses <code>typedef</code>{" "}
              names such as <code>Pgno</code> for page numbers. The Rust tab uses the real type
              definitions from FrankenSQLite&apos;s <code>fsqlite-types</code> crate.
            </p>
            <p>
              A C <code>typedef</code> gives an integer type a new name, but the compiler still
              treats it as the underlying integer. <code>Pgno</code> and <code>TxnId</code> are
              interchangeable as far as C is concerned.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Click the <strong>C (typedef aliases)</strong> tab. Passing a <code>TxnId</code> to a
              function that asks for a <code>Pgno</code> compiles (the 64-bit value is silently
              narrowed to 32 bits). The program runs and reads the wrong page.
            </p>
            <div>
              Now click the <strong>Rust (FrankenSQLite)</strong> tab. With the{" "}
              <FrankenJargon term="newtype-pattern">newtype</FrankenJargon> pattern,{" "}
              <code>PageNumber</code> and <code>TxnId</code> are distinct structs that each wrap an
              integer (<code>NonZeroU32</code> and <code>NonZeroU64</code>). The same mistake is
              rejected with error <code>E0308</code> before the code ever runs.
            </div>
          </>
        }
        whyItMatters={
          <>
            <div>
              A database engine passes page numbers, transaction IDs and commit sequence numbers
              through thousands of call sites. Handing the wrong integer to the wrong function is
              an easy mistake to make and a hard one to trace, because it usually shows up as
              corrupted data far from the cause.
            </div>
            <div>
              FrankenSQLite uses distinct types for <code>PageNumber</code>, <code>PageSize</code>,{" "}
              <code>TxnId</code>, <code>CommitSeq</code>, <code>SchemaEpoch</code> and others, so
              this kind of mix-up becomes a compile error. The wrappers compile down to the integer
              inside, so there is no runtime cost. They don&apos;t catch every logic bug: a
              wrong <code>PageNumber</code> is still a valid <code>PageNumber</code>.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
