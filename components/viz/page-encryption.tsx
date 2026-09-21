"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cpu, KeyRound, Lock, ShieldAlert, Unlock } from "lucide-react";
import { useState } from "react";
import { FrankenJargon } from "@/components/franken-jargon";
import VizContainer from "./viz-container";

export default function PageEncryption() {
  const [step, setStep] = useState(0);

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <VizContainer
      title="Transparent Page-Level Encryption"
      description="Unlike C SQLite which requires a paid proprietary extension (SEE) for encryption, FrankenSQLite includes XChaCha20-Poly1305 AEAD encryption built directly into the open-source engine."
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-[#050505] p-4 md:p-6 justify-between relative">
        <div className="flex justify-center gap-2 mb-8">
          {["Plaintext", "Encrypt", "AEAD Layout", "Verify"].map((label, i) => (
            <div
              key={label}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${i === step ? "border-teal-500 bg-teal-500/20 text-teal-400" : "border-white/10 text-slate-500"}`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
          {/* Step 0: Plaintext */}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4"
              >
                <Unlock className="w-12 h-12 text-slate-400" />
                <div className="w-64 h-32 rounded-xl border-2 border-slate-700 bg-slate-900/50 p-4 font-mono text-[10px] text-slate-400 flex flex-col gap-2 relative overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: "linear-gradient(#334155 1px, transparent 1px)",
                      backgroundSize: "100% 12px",
                    }}
                  />
                  <span className="text-white font-bold mb-1">Raw B-Tree Page (4096 bytes)</span>
                  <span>00 01 00 00 00 00 00 15</span>
                  <span>0F C1 13 A4 00 00 00 00</span>
                  <span>...</span>
                  <span>[User Data Visible]</span>
                </div>
              </motion.div>
            )}

            {/* Step 1: Encrypting */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 w-full max-w-lg"
              >
                <div className="flex justify-between w-full items-center">
                  {/* Key Derivation */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border border-purple-500/30 bg-purple-500/10 flex items-center justify-center">
                      <KeyRound className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-[10px] font-bold text-purple-400">Argon2id KEK</span>
                  </div>

                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  >
                    <Cpu className="w-8 h-8 text-teal-500" />
                  </motion.div>

                  {/* Nonce */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center">
                      <span className="font-mono text-xs font-bold text-amber-400">RNG</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400">24-Byte Nonce</span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs font-bold text-white mb-1">
                    <FrankenJargon term="aead">XChaCha20-Poly1305</FrankenJargon> Engine
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Encrypting 4096 bytes using stream cipher...
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: AEAD Layout */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <Lock className="w-12 h-12 text-teal-500" />

                <div className="w-full max-w-sm flex h-24 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <div className="w-16 bg-amber-500/20 border-r border-amber-500/50 flex flex-col items-center justify-center p-2 text-center group relative">
                    <span className="text-[10px] font-black text-amber-400">NONCE</span>
                    <span className="text-[8px] font-mono text-amber-200/50 mt-1">24B</span>
                  </div>
                  <div className="flex-1 bg-teal-500/10 border-r border-teal-500/30 flex flex-col items-center justify-center relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #14b8a6 0, #14b8a6 1px, transparent 0, transparent 50%)",
                        backgroundSize: "10px 10px",
                      }}
                    />
                    <span className="text-xs font-black text-teal-400 z-10 tracking-widest">
                      CIPHERTEXT
                    </span>
                    <span className="text-[9px] font-mono text-teal-200/50 mt-1 z-10">
                      4096 bytes
                    </span>
                  </div>
                  <div className="w-16 bg-rose-500/20 flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-[10px] font-black text-rose-400">MAC</span>
                    <span className="text-[8px] font-mono text-rose-200/50 mt-1">16B</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 max-w-[300px] text-center mt-2">
                  The Nonce guarantees uniqueness. The Ciphertext hides the data. The MAC (Message
                  Authentication Code) guarantees nobody tampered with the file.
                </p>
              </motion.div>
            )}

            {/* Step 3: Verify */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 w-full max-w-md"
              >
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col items-center text-center cursor-pointer hover:bg-rose-500/10 transition-colors">
                    <ShieldAlert className="w-8 h-8 text-rose-500 mb-2" />
                    <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1">
                      Bit Rot / Tampering
                    </div>
                    <div className="text-[9px] text-slate-400">
                      If a single bit of ciphertext changes, the Poly1305 MAC check will fail during
                      decryption.
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col items-center text-center cursor-pointer hover:bg-amber-500/10 transition-colors">
                    <Lock className="w-8 h-8 text-amber-500 mb-2" />
                    <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1">
                      O(1) Instant Rekey
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Change passwords instantly. We only re-encrypt the KEK, not the entire
                      multi-gigabyte database.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4 mt-4">
          <div className="flex gap-2 w-full justify-center">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs font-bold transition-all"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={step === 3}
              className="px-6 py-2 rounded-lg bg-teal-500 text-black hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500 text-xs font-black transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </VizContainer>
  );
}
