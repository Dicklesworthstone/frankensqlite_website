import { expect, test, type Page } from "@playwright/test";
import { engineSnapshot } from "../../lib/site-config";
import { assertNoConsoleErrors, captureConsole, scrollToSection, waitForHydration } from "./helpers";

/** Step dots are hidden below Tailwind's md breakpoint; only Prev/Next show on phones. */
const MD_BREAKPOINT = 768;

async function openSection(page: Page, route: string, sectionId: string) {
  await page.goto(route);
  await waitForHydration(page);
  await scrollToSection(page, sectionId);
  return page.locator(`#${sectionId}`);
}

// ============================================================================
// 1. MVCC Concurrency Race (homepage #the-problem)
// ============================================================================

test.describe("MVCC Concurrency Race", () => {
  test("renders both panels", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    const section = await openSection(page, "/", "the-problem");

    await expect(section.getByText("Single Writer Lock", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(section.getByText("Page-Level MVCC Writers", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    const svgs = section.locator("svg");
    await expect(svgs.first()).toBeVisible({ timeout: 10000 });
    expect(await svgs.count()).toBeGreaterThanOrEqual(2);

    // Throughput is labeled as simulated, not measured
    await expect(section.getByText("commits/s (sim)").first()).toBeVisible();

    assertNoConsoleErrors(consoleLogs);
  });

  test("play button starts animation", async ({ page }) => {
    const section = await openSection(page, "/", "the-problem");

    const playBtn = section.getByRole("button", { name: "Play simulation" });
    await expect(playBtn).toBeVisible({ timeout: 10000 });
    await playBtn.click();

    await expect(section.getByRole("button", { name: "Pause simulation" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("reset button is visible and clickable", async ({ page }) => {
    const section = await openSection(page, "/", "the-problem");

    const resetBtn = section.getByRole("button", { name: "Reset simulation" });
    await expect(resetBtn).toBeVisible({ timeout: 10000 });
    await resetBtn.click();
    await expect(section.getByRole("button", { name: "Play simulation" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("writer slider changes writer count label", async ({ page }) => {
    const section = await openSection(page, "/", "the-problem");

    await expect(section.getByText(/Writers:\s*4/).first()).toBeVisible({ timeout: 10000 });

    const writerSlider = section
      .locator("label")
      .filter({ hasText: /Writers/ })
      .locator('input[type="range"]');
    await writerSlider.fill("6");

    await expect(section.getByText(/Writers:\s*6/).first()).toBeVisible({ timeout: 5000 });
  });

  test("both panels contain SVG visualization elements", async ({ page }) => {
    const section = await openSection(page, "/", "the-problem");

    const circles = section.locator("svg circle");
    await expect(circles.first()).toBeVisible({ timeout: 10000 });
    expect(await circles.count()).toBeGreaterThanOrEqual(4);

    await expect(section.locator("svg text").filter({ hasText: "T1" }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

// ============================================================================
// 2. Version Chain Explorer (/architecture #mvcc)
// ============================================================================

test.describe("Version Chain Explorer", () => {
  test("renders with step indicator showing Step 1 of 7", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    const section = await openSection(page, "/architecture", "mvcc");

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });
    await expect(section.getByText("Page Version Chain Explorer").first()).toBeVisible();

    assertNoConsoleErrors(consoleLogs);
  });

  test("next button advances to Step 2 of 7", async ({ page }) => {
    const section = await openSection(page, "/architecture", "mvcc");

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });
    await section.getByRole("button", { name: "Next step" }).click();
    await expect(section.getByText("Step 2 of 7").first()).toBeVisible({ timeout: 5000 });
  });

  test("step dots jump to a step on wide screens and hide on phones", async ({
    page,
    viewport,
  }) => {
    const section = await openSection(page, "/architecture", "mvcc");
    const stepDot5 = section.getByRole("button", { name: "Go to step 5" });

    if ((viewport?.width ?? 0) < MD_BREAKPOINT) {
      await expect(stepDot5).toBeHidden();
      return;
    }
    await stepDot5.click();
    await expect(section.getByText("Step 5 of 7").first()).toBeVisible({ timeout: 5000 });
  });

  test("can navigate through all 7 steps", async ({ page }) => {
    const section = await openSection(page, "/architecture", "mvcc");
    const nextBtn = section.getByRole("button", { name: "Next step" });

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });
    for (let step = 2; step <= 7; step++) {
      await nextBtn.click();
      await expect(section.getByText(`Step ${step} of 7`).first()).toBeVisible({ timeout: 5000 });
    }
    await expect(nextBtn).toBeDisabled();
  });
});

// ============================================================================
// 3. RaptorQ repair demo (homepage #self-healing)
// ============================================================================

test.describe("RaptorQ Repair Demo", () => {
  const pageTiles = (section: ReturnType<Page["locator"]>) =>
    section.getByRole("button", { name: /^Page \d+, / });

  test("renders 16 healthy page tiles", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    const section = await openSection(page, "/", "self-healing");

    await expect(section.getByText("RaptorQ Repair, Illustrated").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(pageTiles(section).first()).toBeVisible({ timeout: 10000 });
    expect(await pageTiles(section).count()).toBe(16);
    expect(await section.getByRole("button", { name: /^Page \d+, healthy$/ }).count()).toBe(16);
    await expect(section.getByText(/All pages intact/).first()).toBeVisible();

    assertNoConsoleErrors(consoleLogs);
  });

  test("a damaged page is repaired", async ({ page }) => {
    const section = await openSection(page, "/", "self-healing");

    await section.getByRole("button", { name: "Page 0, healthy" }).click();
    // Recovery is simulated on a timer (~2s): damaged, then rebuilt from repair symbols.
    await expect(section.getByRole("button", { name: "Page 0, repaired" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("reset button restores all pages", async ({ page }) => {
    const section = await openSection(page, "/", "self-healing");

    await section.getByRole("button", { name: "Page 0, healthy" }).click();
    await section.getByRole("button", { name: "Reset", exact: true }).click();

    await expect(section.getByText(/All pages intact/).first()).toBeVisible({ timeout: 10000 });
    expect(await section.getByRole("button", { name: /^Page \d+, healthy$/ }).count()).toBe(16);
  });

  test("loss-bound calculator is labeled as a toy model", async ({ page }) => {
    const section = await openSection(page, "/", "self-healing");

    await expect(section.getByText("Toy Model: Independent Symbol Loss").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(section.getByText("Source symbols (K)").first()).toBeVisible();
    await expect(section.getByText("Per-symbol loss prob (p)").first()).toBeVisible();
    await expect(section.getByText("Overhead %").first()).toBeVisible();
    await expect(section.getByText("Union bound (toy model)").first()).toBeVisible();
  });
});

// ============================================================================
// 4. Conflict Ladder (/architecture #merge-ladder)
// ============================================================================

test.describe("Conflict Ladder", () => {
  const SCENARIOS = ["Different pages", "Same page, different rows", "Same row"] as const;

  test("renders with scenario selector", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    const section = await openSection(page, "/architecture", "merge-ladder");

    await expect(section.getByText("Write Conflict Resolution Ladder").first()).toBeVisible({
      timeout: 10000,
    });
    for (const name of SCENARIOS) {
      await expect(section.getByRole("button", { name, exact: true })).toBeVisible();
    }

    assertNoConsoleErrors(consoleLogs);
  });

  test("step indicator is visible and stepper works", async ({ page }) => {
    const section = await openSection(page, "/architecture", "merge-ladder");

    await expect(section.getByText("Step 1 of 3").first()).toBeVisible({ timeout: 10000 });
    await section.getByRole("button", { name: "Next step" }).click();
    await expect(section.getByText("Step 2 of 3").first()).toBeVisible({ timeout: 5000 });
  });

  test("switching scenario changes step count", async ({ page }) => {
    const section = await openSection(page, "/architecture", "merge-ladder");

    await expect(section.getByText("Step 1 of 3").first()).toBeVisible({ timeout: 10000 });

    await section.getByRole("button", { name: "Same page, different rows", exact: true }).click();
    await expect(section.getByText("Step 1 of 5").first()).toBeVisible({ timeout: 5000 });
    // The live outcome is spelled out alongside the dormant design
    await expect(section.getByText(/Today: the later committer retries/).first()).toBeVisible();

    await section.getByRole("button", { name: "Same row", exact: true }).click();
    await expect(section.getByText("Step 1 of 5").first()).toBeVisible({ timeout: 5000 });
  });

  test("SVG content renders inside the component", async ({ page }) => {
    const section = await openSection(page, "/architecture", "merge-ladder");

    const svg = section.locator('svg[viewBox="0 0 600 380"]');
    await expect(svg).toBeVisible({ timeout: 10000 });
    expect(await svg.locator("rect").count()).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 5. Safety Dashboard (homepage #safety)
// ============================================================================

test.describe("Safety Dashboard", () => {
  test("all 4 cards render", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    const section = await openSection(page, "/", "safety");

    await expect(section.getByText("Safety Dashboard").first()).toBeVisible({ timeout: 10000 });
    await expect(
      section.getByText(`of ${engineSnapshot.workspaceCrates} workspace crates allow`).first(),
    ).toBeVisible();
    await expect(section.getByText("Newtype Safety").first()).toBeVisible();
    await expect(section.getByText("Bug Classes: C vs Safe Rust").first()).toBeVisible();
    await expect(section.getByText("Page Locks Can't Deadlock").first()).toBeVisible();

    assertNoConsoleErrors(consoleLogs);
  });

  test("names the two crates that allow unsafe", async ({ page }) => {
    const section = await openSection(page, "/", "safety");

    await expect(section.getByText("fsqlite-vfs", { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(section.getByText("fsqlite-c-api", { exact: true }).first()).toBeVisible();
  });

  test("bug-class table is visible with rows", async ({ page }) => {
    const section = await openSection(page, "/", "safety");

    await expect(section.getByText("Vulnerability").first()).toBeVisible({ timeout: 10000 });
    for (const vuln of [
      "Buffer overflow",
      "Use-after-free",
      "Double-free",
      "Data race",
      "Integer overflow",
    ]) {
      await expect(section.getByText(vuln).first()).toBeVisible();
    }
    expect(await section.locator("table tbody tr").count()).toBe(5);
  });
});

// ============================================================================
// 6. Query Pipeline (/architecture #query-path)
// ============================================================================

test.describe("Query Pipeline", () => {
  test("renders with step indicator", async ({ page }) => {
    const consoleLogs = captureConsole(page);
    const section = await openSection(page, "/architecture", "query-path");

    await expect(section.getByText("Query Pipeline Flythrough").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(section.getByText("Step 1 of 7").first()).toBeVisible();

    assertNoConsoleErrors(consoleLogs);
  });

  test("SQL query text is visible", async ({ page }) => {
    const section = await openSection(page, "/architecture", "query-path");

    await expect(section.getByText("SELECT * FROM users WHERE id = 42").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("layer bands are visible", async ({ page }) => {
    const section = await openSection(page, "/architecture", "query-path");

    for (const layer of [
      "Parse",
      "Compile",
      "Execute",
      "B-tree + Pager + MVCC",
      "WAL + VFS",
      "Result Row",
    ]) {
      await expect(section.getByText(layer, { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("stepper navigation works", async ({ page }) => {
    const section = await openSection(page, "/architecture", "query-path");

    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 10000 });

    await section.getByRole("button", { name: "Next step" }).click();
    await expect(section.getByText("Step 2 of 7").first()).toBeVisible({ timeout: 5000 });
    await expect(section.getByText("fsqlite-parser").first()).toBeVisible({ timeout: 5000 });

    await section.getByRole("button", { name: "Previous step" }).click();
    await expect(section.getByText("Step 1 of 7").first()).toBeVisible({ timeout: 5000 });
  });

  test("step dots jump to a step on wide screens and hide on phones", async ({
    page,
    viewport,
  }) => {
    const section = await openSection(page, "/architecture", "query-path");
    const stepDot4 = section.getByRole("button", { name: "Go to step 4" });

    if ((viewport?.width ?? 0) < MD_BREAKPOINT) {
      await expect(stepDot4).toBeHidden();
      return;
    }
    await stepDot4.click();
    await expect(section.getByText("Step 4 of 7").first()).toBeVisible({ timeout: 5000 });
  });
});
