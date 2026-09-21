import { Eye } from "lucide-react";
import type { Metadata } from "next";
import FrankenGlitch from "@/components/franken-glitch";
import ScreenshotGallery from "@/components/screenshot-gallery";
import { screenshots } from "@/lib/content";

export const metadata: Metadata = {
  title: "Showcase",
  description:
    "Visual showcase of FrankenSQLite's architecture diagram, illustration, and system design.",
};

export default function ShowcasePage() {
  return (
    <main id="main-content" className="relative">
      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/5 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 mb-8">
            <Eye className="h-3 w-3" />
            Visual_Archive
          </div>
          <FrankenGlitch trigger="always" intensity="low">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6">
              Showcase
            </h1>
          </FrankenGlitch>
          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl">
            Architecture diagrams and illustrations of the FrankenSQLite system. Every image
            documents a real aspect of the 26-crate workspace design.
          </p>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-16 pb-32">
        <div className="mx-auto max-w-7xl px-6">
          <ScreenshotGallery screenshots={screenshots} columns={2} />
        </div>
      </section>
    </main>
  );
}
