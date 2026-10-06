"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Key, Lock, ShieldCheck, Unlock } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import Stepper, { type Step } from "@/components/viz/stepper";
import VizContainer from "@/components/viz/viz-container";
import { VizExposition } from "./viz-exposition";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GRID_COLS = 16;
const GRID_ROWS = 16;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

const STEPS: Step[] = [
  {
    label: "Plaintext page",
    description:
      "A 4 KiB database page as raw bytes. Anyone who can read the file can read this. Today this is what FrankenSQLite writes, even if you set PRAGMA key.",
  },
  {
    label: "Passphrase",
    description:
      "In the design, the user supplies a passphrase with PRAGMA key (not dispatched yet). The key that encrypts pages is random; the passphrase only protects it.",
  },
  {
    label: "Argon2id key derivation",
    description:
      "Argon2id turns the passphrase and a random 16-byte salt into a 256-bit key-encryption key (KEK). Code defaults: 64 MiB of memory, 3 passes, 4 lanes. The KEK wraps the random 256-bit data key (DEK).",
  },
  {
    label: "Nonce + AAD",
    description:
      "Each page write draws a fresh random 24-byte nonce. The page number and a 16-byte database ID are bound as associated data (AAD), tying the ciphertext to its position and its database.",
  },
  {
    label: "Encrypt",
    description:
      "XChaCha20 encrypts the page body with the DEK and nonce. Poly1305 computes a 16-byte tag over the ciphertext and the AAD. The visible structure disappears.",
  },
  {
    label: "On-disk format",
    description:
      "The page keeps its size. Its last 40 reserved bytes hold the 24-byte nonce and the 16-byte tag, so a 4,096-byte page carries 4,056 bytes of ciphertext. Rewriting a page uses a new nonce.",
  },
  {
    label: "Decrypt & verify",
    description:
      "On read, the tag is checked against the ciphertext, page number and database ID. If anything was altered, the read fails and no plaintext is returned.",
  },
];

/* ------------------------------------------------------------------ */
/*  Color generation helpers                                           */
/* ------------------------------------------------------------------ */

/** Generate a structured green gradient pattern (plaintext) */
function generatePlaintextColors(): string[] {
  const colors: string[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const h = 140 + Math.floor((col / GRID_COLS) * 30);
      const s = 50 + Math.floor((row / GRID_ROWS) * 30);
      const l = 25 + Math.floor((col / GRID_COLS) * 25 + (row / GRID_ROWS) * 10);
      colors.push(`hsl(${h}, ${s}%, ${l}%)`);
    }
  }
  return colors;
}

/** Generate random scrambled colors (ciphertext) using a seed for stability */
function generateCiphertextColors(seed: number): string[] {
  // Simple deterministic PRNG
  let state = seed;
  function nextRand() {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  }

  const colors: string[] = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const h = Math.floor(nextRand() * 360);
    const s = 40 + Math.floor(nextRand() * 40);
    const l = 20 + Math.floor(nextRand() * 30);
    colors.push(`hsl(${h}, ${s}%, ${l}%)`);
  }
  return colors;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ByteGrid({
  colors,
  scrambling,
  tag,
  prefersReducedMotion,
}: {
  colors: string[];
  scrambling: boolean;
  tag?: boolean;
  prefersReducedMotion: boolean | null;
}) {
  return (
    <div className="relative">
      <div
        className="grid gap-[1px] mx-auto"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          maxWidth: 320,
        }}
      >
        {colors.map((color, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-[2px]"
            animate={{ backgroundColor: color }}
            transition={{
              duration: prefersReducedMotion ? 0 : scrambling ? 0.4 + (i % 5) * 0.05 : 0.3,
              delay: prefersReducedMotion ? 0 : scrambling ? Math.floor(i / GRID_COLS) * 0.03 : 0,
            }}
          />
        ))}
      </div>
      {/* Poly1305 tag bar */}
      {tag && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: 0.3 }}
          className="mt-1 h-3 rounded-sm bg-gradient-to-r from-amber-500/40 via-amber-500/60 to-amber-500/40 border border-amber-500/30 mx-auto origin-left"
          style={{ maxWidth: 320 }}
        >
          <span className="text-[7px] font-mono font-bold text-amber-300 leading-none flex items-center justify-center h-full">
            Poly1305 Tag (16 bytes)
          </span>
        </motion.div>
      )}
    </div>
  );
}

function InfoPanel({
  step,
  prefersReducedMotion,
}: {
  step: number;
  prefersReducedMotion: boolean | null;
}) {
  const panels: Record<number, React.ReactNode> = {
    0: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <Unlock className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Unprotected</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Raw B-tree page on disk, with visible structure. This is how FrankenSQLite stores pages
          today, with or without <code>PRAGMA key</code>.
        </p>
      </div>
    ),
    1: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-400">
          <Key className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Passphrase</span>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <code className="text-xs font-mono text-amber-300">correct-horse-battery-staple</code>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The only secret the user supplies. It protects the random data key rather than
          encrypting pages directly. Planned entry point: <code>PRAGMA key</code>, which is
          currently ignored.
        </p>
      </div>
    ),
    2: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-purple-400">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Argon2id KDF</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">memory</span>
            <span className="text-purple-300 font-bold">64 MiB</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">iterations</span>
            <span className="text-purple-300 font-bold">3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">parallelism</span>
            <span className="text-purple-300 font-bold">4 lanes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">salt</span>
            <span className="text-purple-300 font-bold">16 random bytes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">output</span>
            <span className="text-purple-300 font-bold">256-bit KEK</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-purple-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: prefersReducedMotion ? 0 : 2, ease: "easeInOut" }}
          />
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Memory-hard, so every passphrase guess costs time and 64 MiB of RAM. The KEK then wraps
          the DEK; rekey re-wraps the DEK without touching pages.
        </p>
      </div>
    ),
    3: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-blue-400">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Nonce + AAD</span>
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
            <div className="text-[9px] text-slate-500 font-mono mb-1">24-byte nonce</div>
            <code className="text-[10px] font-mono text-blue-300 break-all">
              a7 3f b2 19 c4 e8 01 d6 55 aa 72 0b f1 3c 89 4e 22 d7 b5 6a 91 e0 c3 48
            </code>
          </div>
          <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-3 py-2">
            <div className="text-[9px] text-slate-500 font-mono mb-1">
              AAD (page number ‖ database ID)
            </div>
            <code className="text-[10px] font-mono text-teal-300 break-all">
              be_u32(1204) ‖ database_id[16]
            </code>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every page write gets a fresh random nonce. Because the page number and database ID are
          bound as associated data, ciphertext moved to another page or another database fails
          authentication.
        </p>
      </div>
    ),
    4: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-teal-400">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">XChaCha20-Poly1305</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          XChaCha20 XORs the page body with a keystream derived from the DEK and nonce. Poly1305
          authenticates the ciphertext and the associated data. The structure disappears.
        </p>
      </div>
    ),
    5: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-teal-400">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Encrypted</span>
        </div>
        <div className="space-y-1 text-xs font-mono text-slate-500">
          <div className="flex items-center justify-between">
            <span>ciphertext</span>
            <span className="text-teal-400">4,056 bytes</span>
          </div>
          <div className="flex items-center justify-between">
            <span>nonce</span>
            <span className="text-blue-400">24 bytes</span>
          </div>
          <div className="flex items-center justify-between">
            <span>poly1305 tag</span>
            <span className="text-amber-400">16 bytes</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-1">
            <span>page total</span>
            <span className="text-slate-300">4,096 bytes</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Nonce and tag live in the page&apos;s reserved bytes, so the database needs{" "}
          <code>reserved_bytes</code> of at least 40. Wrapped by the KEK, the DEK is a 72-byte
          blob (nonce, encrypted key, tag).
        </p>
      </div>
    ),
    6: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-wider">Verified</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, type: "spring" }}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </motion.div>
          <span className="text-xs font-bold text-emerald-400">Tag verified</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          A wrong key, a flipped bit or a page moved from elsewhere fails authentication, and no
          plaintext is returned. Plaintext comes back only after the tag checks out.
        </p>
      </div>
    ),
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
        className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
      >
        {panels[step]}
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function EncryptionPipeline() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  const onStepChange = useCallback((s: number) => setStep(s), []);

  // Pre-compute color arrays
  const plaintextColors = useMemo(() => generatePlaintextColors(), []);
  const ciphertextColors = useMemo(() => generateCiphertextColors(42), []);

  // Determine which colors to show based on step
  const gridColors = useMemo(() => {
    if (step <= 3) return plaintextColors;
    if (step === 4 || step === 5) return ciphertextColors;
    // Step 6: decrypt — back to plaintext
    return plaintextColors;
  }, [step, plaintextColors, ciphertextColors]);

  const showTag = step >= 4 && step <= 5;
  const scrambling = step === 4;

  // Status label
  const statusLabel = useMemo(() => {
    if (step <= 3)
      return { text: "PLAINTEXT", color: "text-red-400 border-red-500/30 bg-red-500/5" };
    if (step <= 5)
      return { text: "ENCRYPTED", color: "text-teal-400 border-teal-500/30 bg-teal-500/5" };
    return { text: "DECRYPTED", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" };
  }, [step]);

  return (
    <VizContainer
      title="Page Encryption Pipeline"
      status="dormant"
      description="The design for XChaCha20-Poly1305 page encryption with an Argon2id-protected key. The code exists in fsqlite-pager but is not wired in: PRAGMA key is silently ignored and the database is written unencrypted."
      minHeight={420}
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Not-wired warning */}
        <div className="flex items-start gap-2 rounded-lg border border-orange-400/30 bg-orange-400/5 px-3 py-2 text-[11px] leading-relaxed text-orange-200">
          <Unlock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-300" />
          <span>
            Not active today. <code>PRAGMA key</code> and <code>PRAGMA rekey</code> are not
            implemented, unknown PRAGMAs are ignored without an error, and pages are written in
            plaintext. Do not rely on FrankenSQLite for encryption at rest yet.
          </span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${statusLabel.color}`}
          >
            {step <= 3 ? (
              <Unlock className="h-3 w-3" />
            ) : step <= 5 ? (
              <Lock className="h-3 w-3" />
            ) : (
              <ShieldCheck className="h-3 w-3" />
            )}
            {statusLabel.text}
          </span>
        </div>

        {/* Main layout: grid + info panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Byte grid */}
          <div className="flex flex-col items-center gap-3">
            <ByteGrid
              colors={gridColors}
              scrambling={scrambling}
              tag={showTag}
              prefersReducedMotion={prefersReducedMotion}
            />
            <div className="text-[10px] text-slate-500 font-mono text-center">
              16 x 16 = 256 bytes (representative sample of 4,096)
            </div>
          </div>

          {/* Info panel */}
          <InfoPanel step={step} prefersReducedMotion={prefersReducedMotion} />
        </div>

        {/* Stepper */}
        <Stepper
          steps={STEPS}
          currentStep={step}
          onStepChange={onStepChange}
          autoPlayInterval={3500}
        />
      </div>

      <VizExposition
        whatItIs={
          <>
            <p>
              A walk through FrankenSQLite&apos;s page-encryption design, using a 4 KiB{" "}
              <FrankenJargon term="btree">B-tree</FrankenJargon> page (the grid of bytes). The code
              (<code>PageEncryptor</code> and <code>KeyManager</code> in <code>fsqlite-pager</code>)
              exists and has tests, but no connection calls it.
            </p>
            <p>
              <code>PRAGMA key</code> and <code>PRAGMA rekey</code> are not implemented. Like other
              unrecognized PRAGMAs they return success and do nothing, so the database is written
              unencrypted. The C API shim has no <code>sqlite3_key</code> either.
            </p>
          </>
        }
        howToUse={
          <>
            <p>Follow the stepper through the 7 stages.</p>
            <div>
              A random 256-bit <FrankenJargon term="dek-kek">DEK</FrankenJargon> encrypts pages. A
              key-encryption key derived with{" "}
              <FrankenJargon term="argon2id">Argon2id</FrankenJargon> wraps the DEK.
            </div>
            <p>
              Each page write draws a fresh 24-byte random nonce. The page number and database ID
              are bound as associated data.
            </p>
            <div>
              <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> then encrypts the page
              body, and the nonce and 16-byte authentication tag go into the page&apos;s reserved
              bytes.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              SQLite&apos;s own encryption option, the SQLite Encryption Extension (SEE), is a
              paid, closed-source add-on. The goal here is page-level encryption in the open-source
              engine.
            </p>
            <div>
              The <FrankenJargon term="dek-kek">DEK/KEK</FrankenJargon> split makes changing the
              passphrase cheap: rekey re-wraps a 32-byte key instead of rewriting every page.
              Random 24-byte nonces avoid a global counter, which keeps nonce reuse unlikely across
              crashes and VM snapshot restores. The{" "}
              <FrankenJargon term="aead">AEAD</FrankenJargon> tag means tampering or a misplaced
              page is detected on read. None of this protects data until the PRAGMAs are wired in.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
