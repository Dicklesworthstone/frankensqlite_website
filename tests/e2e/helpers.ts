import path from "node:path";
import { expect, type Page } from "@playwright/test";

export interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
}

/** Capture all console messages during a test */
export function captureConsole(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on("console", (msg) => {
    entries.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
    });
  });
  page.on("pageerror", (error) => {
    entries.push({
      type: "error",
      text: error.message,
      timestamp: Date.now(),
    });
  });
  return entries;
}

/** Assert no console errors occurred */
export function assertNoConsoleErrors(entries: ConsoleEntry[]) {
  const errors = entries.filter((e) => e.type === "error");
  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `  - ${e.text}`).join("\n");
    expect(errors, `Console errors detected:\n${errorMessages}`).toHaveLength(0);
  }
}

/** Wait for Next.js hydration to complete */
export async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle");
  // Give React time to hydrate
  await page.waitForTimeout(500);
}

/** Scroll a section into view and give its deferred visualization time to mount. */
export async function scrollToSection(page: Page, sectionId: string) {
  await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
}

const SQL_JS_DIST = path.resolve(__dirname, "../../node_modules/sql.js/dist");

/**
 * Serve sql.js from node_modules instead of the jsDelivr CDN so the spec
 * viewer tests don't depend on the network. The viewer pins sql.js@1.14.0,
 * the same version package.json installs.
 */
export async function serveSqlJsLocally(page: Page) {
  await page.route(/cdn\.jsdelivr\.net\/npm\/sql\.js@/, async (route) => {
    const file = path.basename(new URL(route.request().url()).pathname);
    await route.fulfill({
      path: path.join(SQL_JS_DIST, file),
      contentType: file.endsWith(".wasm") ? "application/wasm" : "text/javascript",
    });
  });
}

/** Take an annotated screenshot */
export async function takeAnnotatedScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/reports/screenshots/${name}.png`,
    fullPage: false,
  });
}
