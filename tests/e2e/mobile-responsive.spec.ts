import { expect, test } from "@playwright/test";
import { captureConsole, waitForHydration } from "./helpers";

/**
 * Mobile responsive tests — run against the mobile-chrome project (375px).
 * Verifies layout, touch targets, and no horizontal overflow.
 */

const SECTIONS = [
  "the-problem",
  "how-it-works",
  "physical-layout",
  "durability",
  "self-healing",
  "conflict-resolution",
  "safety",
  "encryption",
  "pipeline",
] as const;

async function scrollToSection(page: import("@playwright/test").Page, sectionId: string) {
  await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
}

/**
 * Check that the page has no horizontal overflow at the given viewport.
 */
async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
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

  test("bottom nav bar is visible", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // The mobile bottom nav should be visible
    const bottomNav = page.locator("nav").filter({ has: page.locator("a") });
    await expect(bottomNav.first()).toBeVisible({ timeout: 10000 });
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

    // Hero heading should be visible and not overflow
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

    // The CTA button group should use flex-col on mobile
    const ctaLinks = page.locator("a").filter({ hasText: /Get Started|GitHub/ });
    const firstLink = ctaLinks.first();
    const secondLink = ctaLinks.nth(1);

    await expect(firstLink).toBeVisible({ timeout: 10000 });
    await expect(secondLink).toBeVisible({ timeout: 10000 });

    const box1 = await firstLink.boundingBox();
    const box2 = await secondLink.boundingBox();

    if (box1 && box2) {
      // On mobile, buttons should be stacked (second button below first)
      expect(box2.y).toBeGreaterThan(box1.y);
    }
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
      // Section should not be wider than viewport
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

    // Both panels should be visible
    const cSqlite = section.getByText("C SQLite").first();
    const franken = section.getByText("FrankenSQLite").first();
    await expect(cSqlite).toBeVisible({ timeout: 10000 });
    await expect(franken).toBeVisible({ timeout: 10000 });

    // On mobile, panels should be stacked (grid-cols-1)
    const cBox = await cSqlite.boundingBox();
    const fBox = await franken.boundingBox();
    if (cBox && fBox) {
      // FrankenSQLite panel should be below C SQLite panel
      expect(fBox.y).toBeGreaterThan(cBox.y);
    }
  });

  test("stepper buttons meet 44px minimum tap target", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "how-it-works");

    const section = page.locator("#how-it-works");
    const nextBtn = section.getByRole("button", { name: "Next step" });
    await expect(nextBtn).toBeVisible({ timeout: 10000 });

    const box = await nextBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
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

    test("no horizontal overflow", async ({ page }) => {
      await page.goto("/");
      await waitForHydration(page);
      await assertNoHorizontalOverflow(page);
    });

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

  test("page loads without horizontal overflow", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/spec_evolution");
    await waitForHydration(page);

    // Wait extra time for sql.js WASM to load
    await page.waitForTimeout(3000);

    await assertNoHorizontalOverflow(page);

    // Filter out hydration warnings
    const realErrors = consoleLogs.filter(
      (e) => e.type === "error" && !e.text.includes("hydrat") && !e.text.includes("Hydrat"),
    );
    expect(realErrors).toHaveLength(0);
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

    // Scroll to comparison section
    const comparisonHeading = page.getByText("How It Compares").first();
    await comparisonHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // On mobile, the table should be hidden (md:block)
    // and the card layout should be visible (md:hidden)
    // Check that we can see card-style content
    const featureText = page.getByText("Concurrent Writers").first();
    await expect(featureText).toBeVisible({ timeout: 10000 });

    // The mobile cards should show engine names in a grid
    const frankenLabel = page.getByText("FrankenSQLite").first();
    await expect(frankenLabel).toBeVisible({ timeout: 10000 });
  });
});
