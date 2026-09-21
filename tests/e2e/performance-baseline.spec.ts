import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

/**
 * Performance baseline tests.
 * Measures Core Web Vitals and resource loading for each route.
 * Logs metrics as a baseline — warnings are informational, not failures.
 */

const ROUTES = [
  { path: "/", name: "Homepage" },
  { path: "/architecture", name: "Architecture" },
  { path: "/getting-started", name: "Getting Started" },
  { path: "/showcase", name: "Showcase" },
  { path: "/spec_evolution", name: "Spec Evolution" },
];

interface PerformanceMetrics {
  route: string;
  lcp: number | null;
  cls: number | null;
  ttfb: number | null;
  domContentLoaded: number;
  load: number;
}

/**
 * Measure performance metrics for a given route via Performance API.
 */
async function measurePerformance(
  page: import("@playwright/test").Page,
  path: string,
): Promise<PerformanceMetrics> {
  await page.goto(path, { waitUntil: "load" });
  await waitForHydration(page);

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

    // LCP from PerformanceObserver (may not be available immediately)
    let lcp: number | null = null;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // CLS from layout shift entries
    let cls = 0;
    const layoutShiftEntries = performance.getEntriesByType("layout-shift");
    for (const entry of layoutShiftEntries) {
      const lsEntry = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
      if (!lsEntry.hadRecentInput) {
        cls += lsEntry.value ?? 0;
      }
    }

    return {
      lcp,
      cls,
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : null,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
      load: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
    };
  });

  return {
    route: path,
    ...metrics,
  };
}

// ============================================================================
// Core Web Vitals per route
// ============================================================================

test.describe("Performance Baseline", () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) — measure Core Web Vitals`, async ({ page }) => {
      const metrics = await measurePerformance(page, route.path);

      // Log metrics for baseline tracking
      console.log(`\n--- Performance: ${route.name} (${route.path}) ---`);
      console.log(`  LCP:  ${metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : "N/A"}`);
      console.log(`  CLS:  ${metrics.cls?.toFixed(4) ?? "N/A"}`);
      console.log(`  TTFB: ${metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : "N/A"}`);
      console.log(`  DOMContentLoaded: ${metrics.domContentLoaded.toFixed(0)}ms`);
      console.log(`  Load: ${metrics.load.toFixed(0)}ms`);

      // Informational warnings (not hard failures for baseline)
      if (metrics.lcp && metrics.lcp > 2500) {
        console.warn(`  WARNING: LCP ${metrics.lcp.toFixed(0)}ms > 2500ms threshold`);
      }
      if (metrics.cls !== null && metrics.cls > 0.1) {
        console.warn(`  WARNING: CLS ${metrics.cls.toFixed(4)} > 0.1 threshold`);
      }
      if (metrics.ttfb && metrics.ttfb > 800) {
        console.warn(`  WARNING: TTFB ${metrics.ttfb.toFixed(0)}ms > 800ms threshold`);
      }

      // Basic sanity: page loaded
      expect(metrics.load).toBeGreaterThan(0);
    });
  }
});

// ============================================================================
// Resource loading
// ============================================================================

test.describe("Resource Loading", () => {
  test("no 404s on homepage", async ({ page }) => {
    const failedRequests: string[] = [];

    page.on("response", (response) => {
      if (response.status() === 404) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/");
    await waitForHydration(page);

    // Scroll through the page to trigger lazy loads
    await page.evaluate(async () => {
      for (let i = 0; i < document.body.scrollHeight; i += 500) {
        window.scrollTo(0, i);
        await new Promise((r) => setTimeout(r, 100));
      }
    });

    await page.waitForTimeout(2000);

    if (failedRequests.length > 0) {
      console.warn("404 resources:", failedRequests);
    }
    expect(failedRequests).toHaveLength(0);
  });

  test("no 404s on spec_evolution page", async ({ page }) => {
    const failedRequests: string[] = [];

    page.on("response", (response) => {
      if (response.status() === 404) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/spec_evolution");
    await waitForHydration(page);
    await page.waitForTimeout(5000); // extra wait for WASM

    if (failedRequests.length > 0) {
      console.warn("404 resources:", failedRequests);
    }
    expect(failedRequests).toHaveLength(0);
  });

  test("fonts load within 5 seconds", async ({ page }) => {
    await page.goto("/");

    const fontsLoaded = await page.evaluate(async () => {
      const startTime = Date.now();
      await document.fonts.ready;
      return Date.now() - startTime;
    });

    console.log(`Fonts loaded in ${fontsLoaded}ms`);
    expect(fontsLoaded).toBeLessThan(5000);
  });
});
