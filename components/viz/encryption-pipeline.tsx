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
      "A 4KB database page stored as raw bytes. The structured pattern is visible; anyone with disk access reads this.",
  },
  {
    label: "Passphrase",
    description:
      "The user provides a passphrase. This is the only secret; everything else is derived deterministically.",
  },
  {
    label: "Argon2id key derivation",
    description:
      "Argon2id stretches the passphrase using 64MB of memory, 3 iterations, 1 lane. Deliberately slow and memory-hungry, making GPU brute-force impractical.",
  },
  {
    label: "Nonce + AAD",
    description:
      "A 24-byte random nonce is generated. The page number is bound as Associated Authenticated Data (AAD), tying ciphertext to its position.",
  },
  {
    label: "Encrypt",
    description:
      "XChaCha20 encrypts the page byte-by-byte. Poly1305 computes an authentication tag. The structured pattern vanishes into randomness.",
  },
  {
    label: "On-disk format",
    description:
      "Ciphertext + 16-byte Poly1305 tag + 24-byte nonce. One compromised page reveals nothing about others. Each has a unique nonce.",
  },
  {
    label: "Decrypt & verify",
    description:
      "On read: tag verified first. If any byte was tampered, decryption is rejected before it starts. Integrity proven, then plaintext restored.",
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
          Raw B-tree page on disk. Structured data with visible patterns.
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
          The only user-provided secret. Everything else is derived.
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
            <span className="text-purple-300 font-bold">64 MB</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">iterations</span>
            <span className="text-purple-300 font-bold">3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">parallelism</span>
            <span className="text-purple-300 font-bold">1 lane</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono">output</span>
            <span className="text-purple-300 font-bold">256-bit key</span>
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
        <p className="text-[10px] text-slate-500">GPU brute-force: impractical</p>
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
            <div className="text-[9px] text-slate-500 font-mono mb-1">AAD (page number)</div>
            <code className="text-[10px] font-mono text-teal-300">page_id: 1204</code>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every page gets a unique nonce. The page number is bound as AEAD, so moving ciphertext to
          a different page is detected.
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
          XChaCha20 encrypts. Poly1305 authenticates. Each byte transforms independently, and the
          structured pattern vanishes.
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
            <span className="text-teal-400">4,096 bytes</span>
          </div>
          <div className="flex items-center justify-between">
            <span>poly1305 tag</span>
            <span className="text-amber-400">16 bytes</span>
          </div>
          <div className="flex items-center justify-between">
            <span>nonce</span>
            <span className="text-blue-400">24 bytes</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          One compromised page reveals nothing about others.
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
          <span className="text-xs font-bold text-emerald-400">Tag verified, integrity proven</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tampered data is rejected before decryption. Plaintext restored only after authentication
          succeeds.
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
      description="Watch XChaCha20-Poly1305 encrypt a 4KB page with Argon2id-derived keys."
      minHeight={420}
    >
      <div className="p-4 md:p-6 space-y-4">
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
              You are looking at the page-level encryption pipeline. It demonstrates how a 4KB
              B-Tree page (represented by the grid of bytes) is cryptographically secured before
              being written to disk.
            </p>
          </>
        }
        howToUse={
          <>
            <p>Follow the stepper through the 6 phases.</p>
            <div>
              First, an <FrankenJargon term="argon2id">Argon2id KEK</FrankenJargon> wraps the
              internal <FrankenJargon term="dek-kek">DEK</FrankenJargon>.
            </div>
            <p>
              Then, the engine computes a 24-byte Nonce (Number Used Once). The page number itself
              is cryptographically bound into the algorithm as Authenticated Data.
            </p>
            <div>
              Finally, the <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> algorithm
              scrambles the bytes into pure noise, appending a 16-byte MAC (Message Authentication
              Code) tag to the end.
            </div>
          </>
        }
        whyItMatters={
          <>
            <p>
              In standard SQLite, encryption requires buying a proprietary, closed-source add-on
              (SEE). In FrankenSQLite, it is deeply integrated into the open-source storage layer at
              the <FrankenJargon term="btree">B-tree</FrankenJargon> page level.
            </p>
            <div>
              Because it uses an <FrankenJargon term="aead">AEAD</FrankenJargon> cipher with a{" "}
              <FrankenJargon term="dek-kek">DEK/KEK</FrankenJargon> hierarchy derived via{" "}
              <FrankenJargon term="argon2id">Argon2id</FrankenJargon>, it guarantees both
              confidentiality and integrity. If a malicious actor flips a single bit on disk, or
              tries to copy an encrypted page from one part of the file to another, the Poly1305
              authentication fails instantly, rejecting the read before decryption even begins.
            </div>
          </>
        }
      />
    </VizContainer>
  );
}
