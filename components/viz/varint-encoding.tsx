"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Binary } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";
import { VizExposition } from "./viz-exposition";

// BigInt() calls instead of literals: the tsconfig target predates ES2020.
const ZERO = BigInt(0);
const SEVEN = BigInt(7);
const EIGHT = BigInt(8);
const LOW7 = BigInt(0x7f);
const LOW8 = BigInt(0xff);
const U64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1);

/** Bytes SQLite's varint needs for `value` (mirrors fsqlite-types `varint_len`). */
function varintLen(value: bigint): number {
  for (let len = 1; len <= 8; len++) {
    if (value < BigInt(1) << BigInt(7 * len)) return len;
  }
  return 9;
}

/**
 * SQLite varint, as written by fsqlite-types `write_varint`: big-endian groups
 * of 7 bits with the high bit set on every byte but the last. Values above
 * 2^56 - 1 take 9 bytes, and the 9th byte carries a full 8 bits.
 */
function encodeVarint(value: bigint): number[] {
  const len = varintLen(value);
  const buf: number[] = new Array<number>(len).fill(0);

  if (len === 9) {
    let v = value >> EIGHT;
    for (let i = 7; i >= 0; i--) {
      buf[i] = Number(v & LOW7) | 0x80;
      v >>= SEVEN;
    }
    buf[8] = Number(value & LOW8);
    return buf;
  }

  let v = value;
  for (let i = len - 1; i >= 0; i--) {
    buf[i] = Number(v & LOW7) | (i === len - 1 ? 0 : 0x80);
    v >>= SEVEN;
  }
  return buf;
}

/** The same value as a fixed-width, big-endian 64-bit integer. */
function fixedBytes(value: bigint): number[] {
  return Array.from({ length: 8 }, (_, i) =>
    Number((value >> BigInt(8 * (7 - i))) & LOW8),
  );
}

function toHex(b: number): string {
  return b.toString(16).padStart(2, "0").toUpperCase();
}

export default function VarintEncoding() {
  const [inputVal, setInputVal] = useState<string>("42");

  const digits = inputVal.replace(/[^0-9]/g, "");
  const parsed = digits ? BigInt(digits) : ZERO;
  const isClamped = parsed > U64_MAX;
  const value = isClamped ? U64_MAX : parsed;

  const bytes = encodeVarint(value);
  const fixed = fixedBytes(value);
  const sizeDiff = 8 - bytes.length;

  return (
    <VizContainer
      title="Varints: SQLite's Integer Encoding"
      description="SQLite's file format stores rowids, record header sizes and serial type codes as variable-length integers of 1 to 9 bytes. FrankenSQLite reproduces this encoding byte for byte, which is part of why stock SQLite can read the files it writes."
      minHeight={400}
      status="live"
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 gap-8 relative">
        {/* Input */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-sm">
            <label
              htmlFor="varint-input"
              className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500 mb-2 block text-center"
            >
              Enter a non-negative integer
            </label>
            <input
              id="varint-input"
              type="text"
              inputMode="numeric"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              placeholder="e.g. 1000000"
            />
            {isClamped && (
              <p className="mt-2 text-center text-[10px] font-mono text-amber-400">
                Clamped to 2^64 &minus; 1 ({U64_MAX.toString()})
              </p>
            )}
          </div>
        </div>

        {/* Size Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Fixed 64-bit */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col items-center gap-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Fixed-width 64-bit
            </div>
            <div className="flex flex-wrap gap-1 justify-center max-w-[200px]">
              {fixed.map((b, i) => (
                <div
                  key={i}
                  className="w-8 h-10 rounded border border-slate-700 bg-slate-900 flex items-center justify-center text-[10px] font-mono text-slate-500 opacity-60"
                >
                  {toHex(b)}
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
              <FrankenJargon term="varint">SQLite Varint</FrankenJargon>
            </div>

            <div className="flex flex-wrap gap-1 justify-center max-w-[240px] relative z-10 min-h-[40px]">
              <AnimatePresence mode="popLayout">
                {bytes.map((b, i) => {
                  const bin = b.toString(2).padStart(8, "0");
                  // Every byte but the last carries a continuation flag. (In the
                  // 9-byte form the last byte's high bit is data, not a flag.)
                  const isContinuation = i < bytes.length - 1;
                  return (
                    <motion.div
                      key={`${value.toString()}-${i}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25, delay: i * 0.05 }}
                      className={`w-10 h-12 rounded border flex flex-col items-center justify-center text-[10px] font-mono shadow-sm group relative ${isContinuation ? "border-amber-500/50 bg-amber-500/20 text-amber-200" : "border-teal-500/50 bg-teal-500/20 text-teal-200"}`}
                    >
                      <span className="font-bold">{toHex(b)}</span>

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
          {sizeDiff > 0 ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={bytes.length}
              className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2 text-center"
            >
              {bytes.length} byte{bytes.length > 1 ? "s" : ""} instead of 8 for this value
            </motion.div>
          ) : (
            <div className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-sm font-bold text-center">
              {sizeDiff === 0
                ? "Same size as a fixed 8-byte integer"
                : "9 bytes: one more than a fixed 8-byte integer (values above 2^56 − 1)"}
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-4 text-center max-w-md">
            The high bit of each byte is a flag. If it is 1, another byte follows; if it is 0, this
            is the last byte. A 9th byte, when needed, uses all 8 bits for data. Hover over the
            bytes to see the raw binary.
          </p>
        </div>
      </div>

      <VizExposition
        whatItIs={
          <>
            <div>
              A byte-level view of SQLite&apos;s{" "}
              <FrankenJargon term="varint">variable-length integer</FrankenJargon> format. On the
              left is the value as a fixed-width, big-endian 8-byte integer. On the right is the
              varint encoding that SQLite writes into record headers and B-tree cells.
            </div>
            <p>
              This is SQLite&apos;s format, not a FrankenSQLite invention. FrankenSQLite&apos;s{" "}
              <code>fsqlite-types</code> crate implements the same encoding so the bytes on disk
              match.
            </p>
          </>
        }
        howToUse={
          <>
            <p>
              Type a small number like <code>42</code>. Values from 0 to 127 fit in 7 bits, so the
              varint is a single byte.
            </p>
            <p>
              Now type <code>8589934592</code> (2^33). The varint grows to 5 bytes. Hover over a
              byte to see its bits: every amber byte starts with a <code>1</code>, which tells the
              decoder another byte follows. Try <code>72057594037927936</code> (2^56) to see the
              9-byte form, where the last byte carries a full 8 bits of data.
            </p>
          </>
        }
        whyItMatters={
          <>
            <p>
              Most varints in a database file are small: rowids in modest tables, cell payload
              sizes, record header sizes, serial type codes. A one-byte encoding for 0 to 127 keeps
              record headers and cells compact, so more rows fit on each page. How much space that
              saves depends on the data. A negative rowid is stored as its 64-bit
              two&apos;s-complement pattern, so it takes 9 bytes. (Integer column values are not
              varints; the record body stores them in 1 to 8 bytes, as their serial type says.)
            </p>
            <div>
              FrankenSQLite does not change this format. It reproduces SQLite&apos;s varint,
              record and <FrankenJargon term="btree">B-tree</FrankenJargon> page layouts byte for
              byte, which is what lets stock <code>sqlite3</code> open the files FrankenSQLite
              writes.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
