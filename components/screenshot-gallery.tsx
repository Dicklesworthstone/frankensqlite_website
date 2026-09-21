"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Monitor, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import type { Screenshot } from "@/lib/content";
import { cn } from "@/lib/utils";
import { FrankenContainer } from "./franken-elements";

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(rafId);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

const SLIDE_OFFSET = 400;
const slideVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? SLIDE_OFFSET : -SLIDE_OFFSET,
    opacity: 0,
    scale: dir === 0 ? 0.92 : 0.96,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? -SLIDE_OFFSET : SLIDE_OFFSET,
    opacity: 0,
    scale: 0.96,
  }),
};
const slideTransition = {
  x: { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.8 },
  opacity: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  scale: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
};
const reducedVariants = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

export default function ScreenshotGallery({
  screenshots,
  columns = 2,
}: {
  screenshots: Screenshot[];
  columns?: 2 | 3;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const prefersReduced = useReducedMotion();
  const isLightboxOpen = lightboxIndex !== null;
  useBodyScrollLock(isLightboxOpen);

  const openLightbox = useCallback((index: number) => {
    setDirection(0);
    setLightboxIndex(index);
  }, []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => {
    if (!screenshots.length) return;
    setDirection(1);
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % screenshots.length : null));
  }, [screenshots.length]);
  const goPrev = useCallback(() => {
    if (!screenshots.length) return;
    setDirection(-1);
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + screenshots.length) % screenshots.length : null,
    );
  }, [screenshots.length]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, closeLightbox, goNext, goPrev]);

  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 60) {
        if (dx < 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    },
    [goNext, goPrev],
  );

  const variants = prefersReduced ? reducedVariants : slideVariants;
  const imageSizes =
    columns === 3
      ? "(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
      : "(max-width: 640px) 100vw, 50vw";

  return (
    <>
      <div
        className={cn(
          "grid gap-6 lg:gap-8",
          columns === 3 ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {screenshots.map((screenshot, index) => (
          <motion.div
            key={screenshot.src}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: (index % 4) * 0.1 }}
            viewport={{ once: true }}
          >
            <button
              type="button"
              onClick={() => openLightbox(index)}
              aria-label={`View larger version of ${screenshot.title}`}
              className="group relative w-full text-left focus:outline-none rounded-2xl"
            >
              <FrankenContainer
                withBolts={false}
                withPulse={true}
                className="overflow-hidden glass-modern group-hover:border-teal-500/30 transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] group-hover:-translate-y-1"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={screenshot.src}
                    alt={screenshot.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 saturate-[0.8] group-hover:saturate-100"
                    loading="lazy"
                    sizes={imageSizes}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-4 right-4 h-10 w-10 rounded-full glass-modern flex items-center justify-center text-white opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500">
                    <Maximize2 className="h-4 w-4" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 translate-y-[10px] group-hover:translate-y-0 transition-all duration-500">
                    <div className="flex items-center gap-2 mb-2 text-teal-500">
                      <Monitor className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        Architecture View
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-white leading-tight tracking-tight">
                      {screenshot.title}
                    </h4>
                  </div>
                </div>
              </FrankenContainer>
            </button>
          </motion.div>
        ))}
      </div>
      <Portal>
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-12 cursor-zoom-out"
              onClick={closeLightbox}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[80px]" />
              </div>
              <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20 pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lightboxIndex}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex flex-col"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-500 mb-1">
                      Technical Snapshot
                    </span>
                    <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                      {screenshots[lightboxIndex].title}
                    </h3>
                  </motion.div>
                </AnimatePresence>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="h-12 w-12 rounded-full glass-modern flex items-center justify-center text-white hover:bg-white/10 transition-colors pointer-events-auto shadow-2xl"
                  aria-label="Close image"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-20">
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="h-16 w-16 rounded-full glass-modern flex items-center justify-center text-white pointer-events-auto hover:bg-white/10 transition-all hover:scale-110 active:scale-95 shadow-2xl"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="h-16 w-16 rounded-full glass-modern flex items-center justify-center text-white pointer-events-auto hover:bg-white/10 transition-all hover:scale-110 active:scale-95 shadow-2xl"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </div>
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={lightboxIndex}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={prefersReduced ? { duration: 0.15 } : slideTransition}
                  className="relative z-10 flex items-center justify-center will-change-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={screenshots[lightboxIndex].src}
                    alt={screenshots[lightboxIndex].alt}
                    width={1920}
                    height={1080}
                    className="max-h-[75vh] max-w-[90vw] w-auto h-auto object-contain drop-shadow-[0_0_60px_rgba(20,184,166,0.3)] cursor-default rounded-lg"
                    priority
                    sizes="90vw"
                  />
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full glass-modern border-white/5 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 shadow-2xl">
                {lightboxIndex + 1} / {screenshots.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
