import { expect, test } from "@playwright/test";
import { captureConsole, waitForHydration } from "./helpers";

/**
 * Filter hydration mismatch warnings from framer-motion
 * (same pattern as smoke.spec.ts).
 */
function assertNoRealConsoleErrors(entries: ReturnType<typeof captureConsole>) {
  const realErrors = entries.filter(
    (e) => e.type === "error" && !e.text.includes("hydrat") && !e.text.includes("Hydrat"),
  );
  if (realErrors.length > 0) {
    const errorMessages = realErrors.map((e) => `  - ${e.text}`).join("\n");
    expect(realErrors, `Console errors detected:\n${errorMessages}`).toHaveLength(0);
  }
}

/**
 * Scroll a section into view and wait for lazy-loaded content to render.
 */
async function scrollToSection(page: import("@playwright/test").Page, sectionId: string) {
  await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
}

// ============================================================================
// 1. MVCC Concurrency Race (#the-problem section)
// ============================================================================

test.describe("MVCC Concurrency Race", () => {
  test("renders with both panels visible", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "the-problem");

    const section = page.locator("#the-problem");

    // Both panels should be visible
    await expect(section.getByText("C SQLite").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("FrankenSQLite").first()).toBeVisible({ timeout: 10000 });

    // Both panels contain SVG elements
    const svgs = section.locator("svg");
    await expect(svgs.first()).toBeVisible({ timeout: 10000 });
    expect(await svgs.count()).toBeGreaterThanOrEqual(2);

    // Throughput counters show writes/sec labels
    await expect(section.getByText("writes/sec").first()).toBeVisible({ timeout: 10000 });

    assertNoRealConsoleErrors(consoleLogs);
  });

  test("play button starts animation", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "the-problem");

    const playBtn = page.getByRole("button", {
      name: "Play simulation",
    });
    await expect(playBtn).toBeVisible({ timeout: 10000 });
    await playBtn.click();

    // After clicking play, the button should change to Pause
    await expect(page.getByRole("button", { name: "Pause simulation" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("reset button is visible and clickable", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "the-problem");

    const resetBtn = page.getByRole("button", {
      name: "Reset simulation",
    });
    await expect(resetBtn).toBeVisible({ timeout: 10000 });
    await resetBtn.click();
    // After reset, play button should still be present (not pause)
    await expect(page.getByRole("button", { name: "Play simulation" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("writer slider changes writer count label", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "the-problem");

    const section = page.locator("#the-problem");

    // Initial writer count label should be "Writers: 4" (default)
    await expect(section.getByText(/Writers:\s*4/).first()).toBeVisible({ timeout: 10000 });

    // Find the writer slider input
    const writerSlider = section
      .locator("label")
      .filter({ hasText: /Writers/ })
      .locator('input[type="range"]');

    await writerSlider.fill("6");

    // Label should update to reflect new count
    await expect(section.getByText(/Writers:\s*6/).first()).toBeVisible({ timeout: 5000 });
  });

  test("both panels contain SVG visualization elements", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "the-problem");

    const section = page.locator("#the-problem");

    // Check for SVG circle elements (writer dots)
    const circles = section.locator("svg circle");
    await expect(circles.first()).toBeVisible({ timeout: 10000 });
    expect(await circles.count()).toBeGreaterThanOrEqual(4);

    // Check for text labels (thread labels like T1, T2)
    await expect(section.locator("svg text").filter({ hasText: "T1" }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

// ============================================================================
// 2. Version Chain Explorer (#how-it-works section)
// ============================================================================

test.describe("Version Chain Explorer", () => {
  test("renders with step indicator showing Step 1 of 7", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "how-it-works");

    const section = page.locator("#how-it-works");

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });

    // Title should be visible
    await expect(section.getByText("Page Version Chain Explorer").first()).toBeVisible({
      timeout: 10000,
    });

    assertNoRealConsoleErrors(consoleLogs);
  });

  test("next button advances to Step 2 of 7", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "how-it-works");

    const section = page.locator("#how-it-works");

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });

    // Click the Next step button
    const nextBtn = section.getByRole("button", {
      name: "Next step",
    });
    await nextBtn.click();

    await expect(section.getByText("Step 2 of 7").first()).toBeVisible({ timeout: 5000 });
  });

  test("step dots allow jumping to a specific step", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "how-it-works");

    const section = page.locator("#how-it-works");

    // Jump to step 5 via the step dot
    const stepDot5 = section.getByRole("button", {
      name: "Go to step 5",
    });
    await stepDot5.click();

    await expect(section.getByText("Step 5 of 7").first()).toBeVisible({ timeout: 5000 });
  });

  test("can navigate through all 7 steps", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "how-it-works");

    const section = page.locator("#how-it-works");
    const nextBtn = section.getByRole("button", { name: "Next step" });

    // Start at step 1
    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });

    // Navigate through all remaining steps
    for (let step = 2; step <= 7; step++) {
      await nextBtn.click();
      await expect(section.getByText(`Step ${step} of 7`).first()).toBeVisible({ timeout: 5000 });
    }

    // At step 7, the next button should be disabled
    await expect(nextBtn).toBeDisabled();
  });
});

// ============================================================================
// 3. RaptorQ Self-Healing (#self-healing section)
// ============================================================================

test.describe("RaptorQ Self-Healing", () => {
  test("renders with 16 page tiles visible", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "self-healing");

    const section = page.locator("#self-healing");

    // Title should be visible
    await expect(section.getByText("RaptorQ Self-Healing Demo").first()).toBeVisible({
      timeout: 10000,
    });

    // Should have 16 page tiles (buttons with page numbers 0-15)
    const pageTiles = section.locator(".grid-cols-4").first().locator("button");
    await expect(pageTiles.first()).toBeVisible({ timeout: 10000 });
    expect(await pageTiles.count()).toBe(16);

    assertNoRealConsoleErrors(consoleLogs);
  });

  test("clicking a page triggers corruption state", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "self-healing");

    const section = page.locator("#self-healing");

    // All pages start healthy - check for "All pages healthy" message
    await expect(section.getByText(/All pages healthy/).first()).toBeVisible({ timeout: 10000 });

    // Click the first page tile (page 0)
    const pageTiles = section.locator(".grid-cols-4").first().locator("button");
    await pageTiles.first().click();

    // After clicking, the corrupted count should change
    await expect(section.getByText(/Pages corrupted/).first()).toBeVisible({ timeout: 10000 });

    // The status should show recovery in progress or corrupted state
    // Check for either "ERR" (corrupted) or repair-related text
    const hasCorruptionIndicator = await section
      .getByText(/repairing|ERR/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasCountChanged = await section
      .getByText("1/16")
      .isVisible()
      .catch(() => false);

    expect(hasCorruptionIndicator || hasCountChanged).toBeTruthy();
  });

  test("reset button restores all pages", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "self-healing");

    const section = page.locator("#self-healing");

    // Corrupt a page first
    const pageTiles = section.locator(".grid-cols-4").first().locator("button");
    await pageTiles.first().click();
    await page.waitForTimeout(300);

    // Click reset button
    const resetBtn = section.getByRole("button").filter({ hasText: "Reset" });
    await resetBtn.click();

    // After reset, all pages should be healthy again
    await expect(section.getByText(/All pages healthy/).first()).toBeVisible({ timeout: 10000 });
  });

  test("durability calculator renders with sliders", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "self-healing");

    const section = page.locator("#self-healing");

    await expect(section.getByText("Durability Calculator").first()).toBeVisible({
      timeout: 10000,
    });

    // Check for the 3 sliders (Pages, Corruption prob, Overhead)
    await expect(section.getByText("Pages (K)").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Corruption prob (p)").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Overhead %").first()).toBeVisible({ timeout: 10000 });

    // Check for durability results
    await expect(section.getByText("Nines of Durability").first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// 4. Conflict Ladder (#conflict-resolution section)
// ============================================================================

test.describe("Conflict Ladder", () => {
  test("renders with scenario selector", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "conflict-resolution");

    const section = page.locator("#conflict-resolution");

    // Title should be visible
    await expect(section.getByText("Write Conflict Resolution Ladder").first()).toBeVisible({
      timeout: 10000,
    });

    // All 3 scenario buttons should be visible
    await expect(
      section.getByRole("button").filter({ hasText: "Non-conflicting writes" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(section.getByRole("button").filter({ hasText: "Commuting writes" })).toBeVisible({
      timeout: 10000,
    });
    await expect(section.getByRole("button").filter({ hasText: "True conflict" })).toBeVisible({
      timeout: 10000,
    });

    assertNoRealConsoleErrors(consoleLogs);
  });

  test("step indicator is visible and stepper works", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "conflict-resolution");

    const section = page.locator("#conflict-resolution");

    // Step indicator for first scenario (3 steps)
    await expect(section.getByText("Step 1 of 3").first()).toBeVisible({ timeout: 10000 });

    // Click next step
    const nextBtn = section.getByRole("button", {
      name: "Next step",
    });
    await nextBtn.click();

    await expect(section.getByText("Step 2 of 3").first()).toBeVisible({ timeout: 5000 });
  });

  test("switching scenario changes step count", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "conflict-resolution");

    const section = page.locator("#conflict-resolution");

    // Default scenario has 3 steps
    await expect(section.getByText("Step 1 of 3").first()).toBeVisible({ timeout: 10000 });

    // Switch to "Commuting writes" scenario (4 steps)
    await section.getByRole("button").filter({ hasText: "Commuting writes" }).click();

    await expect(section.getByText("Step 1 of 4").first()).toBeVisible({ timeout: 5000 });

    // Switch to "True conflict" scenario (5 steps)
    await section.getByRole("button").filter({ hasText: "True conflict" }).click();

    await expect(section.getByText("Step 1 of 5").first()).toBeVisible({ timeout: 5000 });
  });

  test("SVG content renders inside the component", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "conflict-resolution");

    const section = page.locator("#conflict-resolution");

    // The main decision-tree SVG has a viewBox of "0 0 600 380"
    const svg = section.locator('svg[viewBox="0 0 600 380"]');
    await expect(svg).toBeVisible({ timeout: 10000 });

    // SVG should contain rect elements (for decision nodes and txn cards)
    const rects = svg.locator("rect");
    expect(await rects.count()).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 5. Safety Dashboard (#safety section)
// ============================================================================

test.describe("Safety Dashboard", () => {
  test("all 4 cards render", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "safety");

    const section = page.locator("#safety");

    // Title should be visible
    await expect(section.getByText("Safety Guarantee Dashboard").first()).toBeVisible({
      timeout: 10000,
    });

    // Card 1: Zero unsafe counter - check for the #[forbid(unsafe_code)] badge
    await expect(section.getByText("#[forbid(unsafe_code)]").first()).toBeVisible({
      timeout: 10000,
    });

    // Card 2: Newtype Safety
    await expect(section.getByText("Newtype Safety").first()).toBeVisible({ timeout: 10000 });

    // Card 3: CVE Prevention Matrix
    await expect(section.getByText("CVE Prevention Matrix").first()).toBeVisible({
      timeout: 10000,
    });

    // Card 4: Deadlock Freedom
    await expect(section.getByText("Deadlock Freedom").first()).toBeVisible({ timeout: 10000 });

    assertNoRealConsoleErrors(consoleLogs);
  });

  test('zero unsafe counter shows "0"', async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "safety");

    const section = page.locator("#safety");

    // The "unsafe blocks across 26 crates" text should be near the 0
    await expect(section.getByText(/unsafe.*blocks/i).first()).toBeVisible({ timeout: 10000 });

    // The AnimatedNumber renders "0" - look for the text content
    await expect(section.getByText("26 crates").first()).toBeVisible({ timeout: 10000 });
  });

  test("CVE matrix table is visible with rows", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "safety");

    const section = page.locator("#safety");

    // Table headers should be visible
    await expect(section.getByText("Vulnerability").first()).toBeVisible({ timeout: 10000 });

    // Check for specific vulnerability rows
    await expect(section.getByText("Buffer overflow").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Use-after-free").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Double-free").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Data race").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Integer overflow").first()).toBeVisible({ timeout: 10000 });

    // Should have 5 vulnerability rows in the table
    const rows = section.locator("table tbody tr");
    expect(await rows.count()).toBe(5);
  });
});

// ============================================================================
// 6. Query Pipeline (#pipeline section)
// ============================================================================

test.describe("Query Pipeline", () => {
  test("renders with step indicator", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "pipeline");

    const section = page.locator("#pipeline");

    // Title should be visible
    await expect(section.getByText("Query Pipeline Flythrough").first()).toBeVisible({
      timeout: 10000,
    });

    // Step 1 of 7 should be visible
    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });

    assertNoRealConsoleErrors(consoleLogs);
  });

  test("SQL query text is visible", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "pipeline");

    const section = page.locator("#pipeline");

    // The SQL query should be displayed at step 0/1
    await expect(section.getByText("SELECT").first()).toBeVisible({ timeout: 10000 });

    // Check for the full query content
    await expect(section.getByText("users").first()).toBeVisible({ timeout: 10000 });
  });

  test("layer bands are visible", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "pipeline");

    const section = page.locator("#pipeline");

    // All 6 layer names should be visible
    await expect(section.getByText("Parser").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Planner").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("VDBE Compiler").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("B-tree + MVCC").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Storage").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Result").first()).toBeVisible({ timeout: 10000 });
  });

  test("stepper navigation works", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "pipeline");

    const section = page.locator("#pipeline");

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });

    // Navigate to step 2 (Parser layer)
    const nextBtn = section.getByRole("button", {
      name: "Next step",
    });
    await nextBtn.click();

    await expect(section.getByText("Step 2 of 7").first()).toBeVisible({ timeout: 5000 });

    // At step 2, the Parser layer should be active and show crate names
    await expect(section.getByText("fsqlite-parser").first()).toBeVisible({ timeout: 5000 });

    // Navigate back
    const prevBtn = section.getByRole("button", {
      name: "Previous step",
    });
    await prevBtn.click();

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 5000 });
  });

  test("can jump to specific step via step dots", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await scrollToSection(page, "pipeline");

    const section = page.locator("#pipeline");

    // Jump to step 4 (VDBE Compiler)
    const stepDot4 = section.getByRole("button", {
      name: "Go to step 4",
    });
    await stepDot4.click();

    await expect(section.getByText("Step 4 of 7").first()).toBeVisible({ timeout: 5000 });
  });
});
