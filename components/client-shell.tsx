"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import ErrorBoundary from "@/components/error-boundary";
import ScrollToTop from "@/components/scroll-to-top";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { SiteProvider } from "@/lib/site-state";

const CustomCursor = dynamic(() => import("@/components/custom-cursor"), {
  ssr: false,
});
const SignalHUD = dynamic(() => import("@/components/signal-hud"), {
  ssr: false,
});

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const isFullViewport = pathname === "/spec_evolution";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  if (isFullViewport) {
    return (
      <ErrorBoundary>
        <SiteProvider>{children}</SiteProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SiteProvider>
        <div className="flex min-h-screen flex-col overflow-x-hidden relative">
          <SignalHUD />
          <CustomCursor />

          <SiteHeader />

          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{
                opacity: 1,
                transition: {
                  duration: prefersReducedMotion ? 0 : 0.4,
                  ease: "easeOut",
                  delay: prefersReducedMotion ? 0 : 0.1,
                },
              }}
              exit={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 0,
                      transition: {
                        duration: 0.3,
                        ease: "easeIn",
                      },
                    }
              }
              className="flex-1 relative"
            >
              {children}
            </motion.div>
          </AnimatePresence>

          <SiteFooter />
          <ScrollToTop />
        </div>
      </SiteProvider>
    </ErrorBoundary>
  );
}
