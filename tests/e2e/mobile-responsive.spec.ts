import { expect, test, type Page } from "@playwright/test";
import {
  assertNoConsoleErrors,
  captureConsole,
  scrollToSection,
  serveSqlJsLocally,
  waitForHydration,
} from "./helpers";

/**
 * Mobile responsive tests. Most groups pin a 375px viewport, so they check the
 * phone layout whichever project runs them.
 */

const SECTIONS = [
  "status",
  "the-problem",
  "how-it-works",
  "physical-layout",
  "conflict-resolution",
  "durability",
  "observability",
  "safety",
  "pipeline",
  "code",
  "self-healing",
  "ecs-stream",
  "safe-merge-ladder",
  "encryption",
  "comparison",
  "crates",
  "how-it-was-built",
  "timeline",
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(overflow, "Page has horizontal overflow").toBe(false);
}

// ============================================================================
// 1. Navigation
// ============================================================================

test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("bottom nav bar is visible and the desktop nav is not", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const bottomNav = page.getByRole("navigation", { name: "Main (mobile)" });
    await expect(bottomNav).toBeVisible({ timeout: 10000 });
    expect(await bottomNav.getByRole("link").count()).toBeGreaterThanOrEqual(3);

    await expect(page.getByRole("navigation", { name: "Main", exact: true })).toBeHidden();
  });

  test("no horizontal overflow on homepage", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await assertNoHorizontalOverflow(page);
  });
});

// ============================================================================
// 2. Homepage sections fit mobile viewport
// ============================================================================

test.describe("Homepage Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("hero text does not overflow", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const heroHeading = page.locator("h1").first();
    await expect(heroHeading).toBeVisible({ timeout: 10000 });

    const box = await heroHeading.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 5); // 5px tolerance
  });

  test("CTA buttons stack vertically on mobile", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const main = page.locator("main");
    const getStarted = main.getByRole("link", { name: /get started/i }).first();
    const viewSource = main.getByRole("link", { name: /view source/i }).first();
    await expect(getStarted).toBeVisible({ timeout: 10000 });
    await expect(viewSource).toBeVisible({ timeout: 10000 });

    const box1 = await getStarted.boundingBox();
    const box2 = await viewSource.boundingBox();
    expect(box1).toBeTruthy();
    expect(box2).toBeTruthy();
    expect(box2!.y).toBeGreaterThanOrEqual(box1!.y + box1!.height);
  });

  for (const sectionId of SECTIONS) {
    test(`section #${sectionId} fits within viewport width`, async ({ page }) => {
      await page.goto("/");
      await waitForHydration(page);
      await scrollToSection(page, sectionId);

      const section = page.locator(`#${sectionId}`);
      await expect(section).toBeVisible({ timeout: 10000 });

      const box = await section.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeLessThanOrEqual(375 + 5);
    });
  }
});

// ============================================================================
// 3. Visualization mobile stacking
// ============================================================================

test.describe("Visualization Mobile Stacking", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("MVCC Race stacks panels vertically", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "the-problem");

    const section = page.locator("#the-problem");
    const single = section.getByText("Single Writer Lock", { exact: true });
    const mvcc = section.getByText("Page-Level MVCC Writers", { exact: true });
    await expect(single).toBeVisible({ timeout: 10000 });
    await expect(mvcc).toBeVisible({ timeout: 10000 });

    const singleBox = await single.boundingBox();
    const mvccBox = await mvcc.boundingBox();
    expect(singleBox).toBeTruthy();
    expect(mvccBox).toBeTruthy();
    expect(mvccBox!.y).toBeGreaterThan(singleBox!.y + singleBox!.height);
  });

  test("stepper buttons meet 44px minimum tap target", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "physical-layout");

    const section = page.locator("#physical-layout");
    for (const name of ["Previous step", "Next step"]) {
      const btn = section.getByRole("button", { name });
      await expect(btn).toBeVisible({ timeout: 10000 });
      const box = await btn.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

// ============================================================================
// 4. Multiple viewport sizes
// ============================================================================

for (const viewport of [
  { width: 390, height: 844, name: "iPhone 14" },
  { width: 768, height: 1024, name: "iPad" },
]) {
  test.describe(`Layout at ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ["/", "/architecture", "/getting-started", "/showcase"]) {
      test(`no horizontal overflow on ${route}`, async ({ page }) => {
        await page.goto(route);
        await waitForHydration(page);
        await assertNoHorizontalOverflow(page);
      });
    }

    test("hero renders correctly", async ({ page }) => {
      await page.goto("/");
      await waitForHydration(page);

      const heroHeading = page.locator("h1").first();
      await expect(heroHeading).toBeVisible({ timeout: 10000 });

      const box = await heroHeading.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 10);
    });
  });
}

// ============================================================================
// 5. Spec Evolution page on mobile
// ============================================================================

test.describe("Spec Evolution Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("loads the spec history without horizontal overflow", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await serveSqlJsLocally(page);
    await page.goto("/spec_evolution");

    // The KPI header is hidden on phones; wait for the rendered spec instead.
    await expect(page.locator(".spec-content h1").first()).toBeVisible({ timeout: 30000 });
    await assertNoHorizontalOverflow(page);
    assertNoConsoleErrors(consoleLogs);
  });
});

// ============================================================================
// 6. Comparison table mobile card layout
// ============================================================================

test.describe("Comparison Table Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("shows card layout on mobile (not table)", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "comparison");

    const section = page.locator("#comparison");
    await expect(section.locator("table")).toBeHidden();
    // The same row text also sits in the hidden table, so only count visible matches.
    const card = section.getByText("Concurrent writers", { exact: true }).filter({ visible: true });
    await expect(card).toHaveCount(1, { timeout: 10000 });
    await expect(section.getByText("FrankenSQLite").filter({ visible: true }).first()).toBeVisible();
  });
});
