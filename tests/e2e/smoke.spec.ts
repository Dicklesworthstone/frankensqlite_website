import { expect, test } from "@playwright/test";
import { engineSnapshot } from "../../lib/site-config";
import {
  assertNoConsoleErrors,
  captureConsole,
  serveSqlJsLocally,
  takeAnnotatedScreenshot,
  waitForHydration,
} from "./helpers";

/**
 * What public/spec_evolution_v1.sqlite3 holds. Update these when the dataset
 * is regenerated. Replaying every patch must land on the engine's current
 * spec; a drifting patch engine shows up here as a wrong line count.
 */
const SPEC_DATASET = { commits: 144, latestLines: "18,232" };

test.describe("Route smoke tests", () => {
  test("/ - Homepage loads with key content", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);

    // Hero section (FrankenGlitch triples h1, so use .first())
    await expect(page.locator("h1").first()).toContainText(/Monster/i);

    // Stats section renders (appears in multiple spots, use .first())
    await expect(page.getByText("Workspace Crates").first()).toBeVisible();

    // Exactly one main navigation shows: the header on desktop, the dock on phones
    await expect(
      page.getByRole("navigation", { name: /^Main/ }).filter({ visible: true }),
    ).toHaveCount(1);

    // CTA buttons
    await expect(page.getByRole("link", { name: /get started/i }).first()).toBeVisible();

    await takeAnnotatedScreenshot(page, "home");
    assertNoConsoleErrors(consoleLogs);
  });

  test("/architecture - Architecture page loads", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/architecture");
    await waitForHydration(page);

    await expect(page.locator("h1").first()).toContainText(/Architecture/i);

    // All 6 layers render (use exact matching to avoid ambiguity)
    for (const layer of ["Foundation", "Storage", "SQL", "Extensions", "Integration", "Verification"]) {
      await expect(page.getByRole("heading", { name: layer, exact: true })).toBeVisible();
    }

    // Every topic is labeled with a status
    await expect(page.getByRole("heading", { name: "The Safe Merge Ladder" })).toBeVisible();
    await expect(page.getByText("Built, not wired").first()).toBeVisible();

    // Crate grid renders with correct count
    await expect(page.getByText(`All ${engineSnapshot.workspaceCrates} Crates`)).toBeVisible();

    await takeAnnotatedScreenshot(page, "architecture");
    assertNoConsoleErrors(consoleLogs);
  });

  test("/getting-started - Getting Started page loads", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/getting-started");
    await waitForHydration(page);

    await expect(page.locator("h1").first()).toContainText(/Get/i);

    // Installation commands present
    await expect(page.getByText(/cargo add fsqlite/).first()).toBeVisible();
    await expect(page.getByText(/install\.sh/).first()).toBeVisible();

    // The unwired encryption PRAGMA is called out, not recommended
    await expect(page.getByText(/What not to rely on yet/).first()).toBeVisible();

    // FAQ section
    await expect(page.getByText(/What is FrankenSQLite\?/).first()).toBeVisible();

    await takeAnnotatedScreenshot(page, "getting-started");
    assertNoConsoleErrors(consoleLogs);
  });

  test("/showcase - Showcase page loads with gallery", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/showcase");
    await waitForHydration(page);

    await expect(page.locator("h1").first()).toContainText(/Showcase/i);

    // At least one image in the gallery
    await expect(page.locator("img").first()).toBeVisible();

    await takeAnnotatedScreenshot(page, "showcase");
    assertNoConsoleErrors(consoleLogs);
  });

  test("/spec_evolution - loads the database and replays the whole history", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await serveSqlJsLocally(page);
    await page.goto("/spec_evolution");

    const kpi = (label: string) =>
      page.locator(".spec-viewer-kpi").filter({ hasText: label }).locator(".spec-viewer-kpi-value");
    await expect(kpi("Commits")).toHaveText(String(SPEC_DATASET.commits), { timeout: 30000 });
    // The viewer opens on the latest entry, so this is the fully replayed spec.
    await expect(kpi("Lines")).toHaveText(SPEC_DATASET.latestLines);
    await expect(page.locator(".spec-content h1").first()).toBeVisible();

    await takeAnnotatedScreenshot(page, "spec-evolution");
    assertNoConsoleErrors(consoleLogs);
  });

  test("navigation between pages works", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);

    // Use whichever main navigation is showing (the mobile dock uses short labels)
    await page
      .getByRole("navigation", { name: /^Main/ })
      .filter({ visible: true })
      .locator('a[href="/architecture"]')
      .click();
    await expect(page).toHaveURL(/architecture/, { timeout: 10000 });
    await expect(page.locator("h1").first()).toContainText(/Architecture/i);

    assertNoConsoleErrors(consoleLogs);
  });

  test("no broken images on homepage", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Wait for images that are in the viewport to load
    await page.waitForTimeout(2000);

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);

      // Only check images that are visible in the viewport
      const isVisible = await img.isVisible().catch(() => false);
      if (!isVisible) continue;

      // Check if the image has finished loading (complete attribute)
      const isComplete = await img.evaluate((el: HTMLImageElement) => el.complete);
      if (!isComplete) continue;

      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const src = await img.getAttribute("src");
      expect(naturalWidth, `Image ${src} should have loaded`).toBeGreaterThan(0);
    }
  });
});
