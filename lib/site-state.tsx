"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn, isTextInputLike } from "./utils";

interface SiteContextType {
  isAnatomyMode: boolean;
  toggleAnatomyMode: () => void;
  isAudioEnabled: boolean;
  toggleAudio: () => void;
  playSfx: (type: "click" | "zap" | "hum" | "error") => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [isAnatomyMode, setIsAnatomyMode] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const humTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (humTimeoutRef.current) clearTimeout(humTimeoutRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);

  const playSfx = useCallback((type: "click" | "zap" | "hum" | "error") => {
    if (!audioEnabledRef.current) return;
    try {
      if (!audioContextRef.current) {
        const WebkitAudioContext = (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
        const AudioCtx = window.AudioContext || WebkitAudioContext;
        if (!AudioCtx) return;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(console.error);
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch (type) {
        case "click":
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case "zap":
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        case "hum":
          osc.type = "triangle";
          osc.frequency.setValueAtTime(60, now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
          gain.gain.linearRampToValueAtTime(0, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        case "error":
          osc.type = "square";
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.setValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
      }
    } catch (err) {
      console.error("Audio protocol failure:", err);
    }
  }, []);

  const toggleAnatomyMode = useCallback(() => {
    setIsAnatomyMode((prev) => !prev);
    playSfx("click");
  }, [playSfx]);

  const toggleAudio = useCallback(() => {
    const nextState = !audioEnabledRef.current;
    audioEnabledRef.current = nextState;
    setIsAudioEnabled(nextState);
    if (nextState) {
      if (humTimeoutRef.current) clearTimeout(humTimeoutRef.current);
      humTimeoutRef.current = setTimeout(() => {
        humTimeoutRef.current = null;
        if (audioEnabledRef.current) playSfx("hum");
      }, 150);
    }
  }, [playSfx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isTextInputLike(document.activeElement);
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
        if (typing) return;
        e.preventDefault();
        toggleAnatomyMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAnatomyMode, playSfx]);

  return (
    <SiteContext.Provider
      value={{
        isAnatomyMode,
        toggleAnatomyMode,
        isAudioEnabled,
        toggleAudio,
        playSfx,
      }}
    >
      <div
        className={cn(
          "min-h-screen transition-colors duration-700",
          isAnatomyMode ? "anatomy-mode" : "",
        )}
      >
        {children}
      </div>

      <style jsx global>{`
        .anatomy-mode [class*="group/container"],
        .anatomy-mode [class*="glass-modern"],
        .anatomy-mode header,
        .anatomy-mode section {
          outline: 1.5px solid rgba(20, 184, 166, 0.3) !important;
          outline-offset: 6px;
          box-shadow: 0 0 20px rgba(20, 184, 166, 0.1) !important;
        }
        .anatomy-mode img, .anatomy-mode video {
          filter: grayscale(0.6) opacity(0.7) contrast(1.1);
          transition: filter 0.8s ease;
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .anatomy-mode::before {
          content: "";
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(20, 184, 166, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20, 184, 166, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 40;
          opacity: 0.6;
        }
        .anatomy-mode::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(20, 184, 166, 0.04) 50%,
            transparent 100%
          );
          background-size: 100% 15px;
          pointer-events: none;
          z-index: 41;
          animation: scanline 12s linear infinite;
        }
      `}</style>
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}
