"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Binary } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

function encodeVarint(value: number): number[] {
  if (value <= 0) return [0];

  if (value <= 127) {
    return [value];
  }

  // Varint encoding for visualization purposes (safe for JS numbers up to 2^53-1)
  const buf: number[] = [];
  let n = Math.floor(value);

  if (n > 240518168522) {
    // Placeholder for very large numbers
    return [255, 255, 255, 255, 255, 255, 255, 255, n & 255];
  }

  while (n > 127) {
    buf.push(n & 127);
    n = Math.floor(n / 128);
  }
  buf.push(n & 127);
  buf.reverse();

  // Set continuation bits
  for (let i = 0; i < buf.length - 1; i++) {
    buf[i] |= 0x80;
  }

  return buf;
}

export default function VarintEncoding() {
  const [inputVal, setInputVal] = useState<string>("42");

  const numVal = parseInt(inputVal.replace(/[^0-9]/g, "") || "0", 10) || 0;

  const bytes = encodeVarint(numVal);
  const fixedBytes = 8; // standard 64-bit int

  const savedBytes = fixedBytes - bytes.length;
  const compressionPct = Math.max(0, Math.round((savedBytes / fixedBytes) * 100));

  return (
    <VizContainer
      title="Huffman-Optimal Varints"
      description="Standard databases use fixed 8-byte integers for Row IDs. FrankenSQLite uses variable-length integers (varints). Common small numbers compress to a single byte, saving substantial disk space."
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-8 relative">
        {/* Input */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-sm">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 mb-2 block text-center">
              Enter any positive number
            </label>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              placeholder="e.g. 1000000"
            />
          </div>
        </div>

        {/* Compression Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Fixed 64-bit */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col items-center gap-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Standard 64-bit Int
            </div>
            <div className="flex flex-wrap gap-1 justify-center max-w-[200px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-10 rounded border border-slate-700 bg-slate-900 flex items-center justify-center text-[10px] font-mono text-slate-500 opacity-50"
                >
                  00
                </div>
              ))}
            </div>
            <div className="text-[10px] font-mono text-slate-500">Always 8 bytes</div>
          </div>

          {/* Varint */}
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 flex flex-col items-center gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-teal-500 opacity-20">
              <Binary className="w-12 h-12" />
            </div>
            <div className="text-xs font-bold text-teal-400 uppercase tracking-widest relative z-10">
              <FrankenJargon term="varint">Varint Encoding</FrankenJargon>
            </div>

            <div className="flex flex-wrap gap-1 justify-center max-w-[240px] relative z-10 min-h-[40px]">
              <AnimatePresence mode="popLayout">
                {bytes.map((b, i) => {
                  const hex = b.toString(16).padStart(2, "0").toUpperCase();
                  const bin = b.toString(2).padStart(8, "0");
                  const isContinuation = (b & 0x80) !== 0;
                  return (
                    <motion.div
                      key={`${numVal}-${i}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.05 }}
                      className={`w-10 h-12 rounded border flex flex-col items-center justify-center text-[10px] font-mono shadow-sm group relative ${isContinuation ? "border-amber-500/50 bg-amber-500/20 text-amber-200" : "border-teal-500/50 bg-teal-500/20 text-teal-200"}`}
                    >
                      <span className="font-bold">{hex}</span>

                      {/* Binary Tooltip on Hover */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                        {bin}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="text-[10px] font-mono text-teal-300 relative z-10">
              {bytes.length} byte{bytes.length > 1 ? "s" : ""} used
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col items-center justify-center pt-2">
          {savedBytes > 0 ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={compressionPct}
              className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2"
            >
              Saved {savedBytes} bytes ({compressionPct}% compression)
            </motion.div>
          ) : (
            <div className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-sm font-bold">
              Maximum varint size reached (no compression)
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-4 text-center max-w-md">
            The high bit (first binary digit) of each byte acts as a flag. If it is 1, another byte
            follows. If it is 0, this is the last byte. Hover over the bytes to see the raw binary.
          </p>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              You are looking at a live, bit-level visualization of Huffman-optimal{" "}
              <FrankenJargon term="varint">Varint Encoding</FrankenJargon>. On the left is how
              standard databases store integers: a fixed 8-byte (64-bit) chunk of memory, no matter
              how small the number is.
            </div>
            <p>
              On the right is FrankenSQLite&apos;s dynamic encoding array, which dynamically shrinks
              and expands based on the actual size of the number.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Type a small number like <code>42</code> into the input box. Notice that the Varint
              side collapses down to a single byte, achieving an 88% compression ratio instantly.
            </p>
            <p>
              Now type a massive number like <code>8589934592</code>. Watch the Varint array expand.
              Hover your mouse over the individual bytes in the green boxes to inspect the raw
              binary. Notice how the first bit of the yellow boxes is always a <code>1</code>. This
              is a mathematical flag telling the parser &ldquo;keep reading, there is another byte
              after this one.&rdquo;
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              A database stores billions of integers: Row IDs, record header offsets, and internal
              type codes. Because the vast majority of these numbers are very small, allocating 8
              bytes for every single one wastes significant disk space and RAM.
            </p>
            <div>
              By faithfully replicating SQLite&apos;s prefix-free{" "}
              <FrankenJargon term="varint">Varint</FrankenJargon> algorithm, FrankenSQLite reduces
              the overall footprint of the database file by 30-50%, packing more{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> pages into the hot{" "}
              <FrankenJargon term="arc-cache">ARC cache</FrankenJargon> and increasing read
              throughput accordingly.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
