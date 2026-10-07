# Changelog

All notable changes to the **FrankenSQLite Website** are documented here, organized by capability area.

This project has no tagged releases or GitHub Releases. The repository uses a linear commit history on `main` with [Conventional Commits](https://www.conventionalcommits.org/) prefixes. Every hash below links to its full commit on GitHub.

- **Repository:** <https://github.com/Dicklesworthstone/frankensqlite_website>
- **Live site:** <https://frankensqlite.com>
- **Engine source:** <https://github.com/Dicklesworthstone/frankensqlite>

---

## Site Foundation (2026-02-26)

Four commits on launch day stood up the entire site from scratch.

### Core Framework and Content Architecture

[`bb86026`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bb86026297d65000780512cd8730920ed18ffdea) — _120 files, +22,744 lines_

The primary application scaffold, covering everything except the spec-evolution subsystem and project manifest.

- **Routing** -- Next.js App Router with five routes: homepage (`/`), architecture deep dive (`/architecture`), getting-started guide (`/getting-started`), showcase gallery (`/showcase`), and shared metadata/OG-image routes.
- **UI composition** -- Global shell with header, footer, custom cursor, signal HUD, section wrappers, animated metric counters, comparison tables, and timeline presentation components.
- **Visualization suite** -- 35 interactive components under `components/viz/` demonstrating MVCC race conditions, WAL lane management, learned indexes, conflict resolution ladders, safety dashboards, storage mode switching, B-tree page exploration, copy-on-write trees, encryption pipelines, RaptorQ healing, VDBE bytecode, and more.
- **Content system** -- Centralized static content model in `lib/content.tsx`, site interaction state in `lib/site-state.tsx`, and shared utilities in `lib/utils.ts`.
- **Hooks** -- Reusable hooks for simulation loops (`use-simulation`), body scroll locking (`use-body-scroll-lock`), haptic feedback (`use-haptic-feedback`), and intersection observation (`use-intersection-observer`).
- **Testing** -- Unit test suite (Vitest) covering content model integrity, utility functions, and patch engine logic. E2E suite (Playwright) with smoke tests, mobile responsive checks, performance baselines, and visualization interaction tests.
- **Static assets** -- FrankenMermaid WASM diagram renderer, branded SVG/WebP images.
- **Configuration** -- TypeScript strict mode, ESLint flat config, PostCSS/Tailwind CSS 4, Playwright config, Vitest config, AGENTS.md, beads issue tracker bootstrap, and `.gitignore`.

### Browser-Based Spec Evolution Viewer

[`bd67c8d`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bd67c8d09b07833c77aff32f3ee9baf7c2a1569a) — _10 files, +2,834 lines_

A self-contained subsystem at `/spec_evolution` that loads a SQLite database in the browser (via sql.js/WASM), reconstructs specification snapshots by applying patches, and renders diffs between revisions.

- Route entry point, dynamic OG/Twitter image generation.
- Main viewer component with diff rendering (diff2html), section navigation, and patch timeline.
- Lazy-load wrapper with Suspense boundary for WASM initialization.
- Client-side patch application engine.
- TypeScript interfaces, configuration constants, and custom viewer CSS.
- Pre-built SQLite database (`public/spec_evolution_v1.sqlite3`, 2.5 MB) containing the initial spec snapshot and full patch history.

### Visualization Fixes (Accessibility and Layout)

[`07c3659`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/07c36596aac06866054e05d2bd6a1fa135f4cde8) — _5 files changed_

Layout, accessibility, and interaction improvements across five visualization components:

- **conflict-ladder** -- Widen decision node width from 140px to 160px to prevent text truncation in longer verdict labels.
- **cow-btree** -- Fix broken indentation in the AnimatePresence/info-panel section that caused layout misalignment in the right sidebar.
- **eprocess-monitor** -- Wire `playSfx("click")` into the simulate/reset button for audio feedback consistency; add `focus-visible` ring for keyboard accessibility.
- **ssi-validation** -- Tighten page indicator dot layout with smaller gap, `overflow-hidden`, centered justify, and constrained width to prevent overflow when many transactions access the same page.
- **witness-plane** -- Wrap the graph SVG in a horizontally-scrollable container with `touch-pan-x` for mobile viewability; shorten label text; add `focus-visible` rings to Reset/Back/Next buttons.

### Project Manifest and Documentation

[`458fe11`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/458fe11f317156e291d671b1d9badd318c579148) — _4 files, +1,912 lines_

- `package.json` establishing the full dependency tree: Next.js 16.1.6, React 19.2.4, sql.js, d3, framer-motion, echarts, TanStack Query/Table/Virtual, diff2html, Tailwind CSS 4. Dev tooling: Vitest, Playwright, Next.js bundle analyzer.
- `bun.lock` lockfile (Bun-only package management by project policy).
- `README.md` documenting project structure, tech stack, routes, development workflow, troubleshooting, and deployment.
- `frankensqlite_website_illustration.webp` hero image.

---

## Social and Branding (2026-02-27)

### GitHub Social Preview Image

[`87d0317`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/87d0317e1adaadd8d0485dd3c7addbc78deba9e0)

Add a 1280x640 branded share image (`gh_og_share_image.png`) for GitHub social previews and link unfurling on social media, Slack, Discord, etc.

---

## Performance (2026-02-27 through 2026-02-28)

Two rounds of performance work targeting both initial page load and spec-evolution viewer responsiveness.

### Initial Load Optimization

[`8848f75`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8848f752ad388e1b162e4df0f85f84681c5e6e63)

Reduce initial page load weight by deferring 19 visualization components until they enter the viewport.

- Add `DeferredViz` wrapper component using `useIntersectionObserver` with `triggerOnce` and 600px `rootMargin` for preloading. Viz sections render a skeleton placeholder until near-viewport.
- Lazy-load `CustomCursor` and `SignalHUD` with `next/dynamic` (SSR disabled) -- these are client-only decorative components.
- Spec-evolution viewer changes: internalize `QueryClientProvider`, add proper TypeScript types for ECharts refs, pre-compute chart data with `useMemo`, batch-load all patches with `getAllPatches()` to eliminate N+1 async calls, add canvas-based evolution map background renderer.
- Configure `turbopack.root` in `next.config.ts` for correct module resolution.

### Spec Evolution Viewer -- Rendering Cache

[`76fdc4c`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/76fdc4c4086f688d645b0686254b25b7d56ae334)

Add `specHtmlCache` and `diffHtmlCache` maps to memoize the output of `marked.parse` and `Diff2Html.html` rendering. Revisiting a previously viewed snapshot or diff mode returns cached HTML immediately instead of re-parsing. Fix `useEffect` dependency arrays to include `currentIdx` so renders correctly invalidate when the snapshot index changes.

### Spec Evolution Viewer -- State Update Deduplication

[`70ba472`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/70ba472869f6f4ecbc68a02e83375257895b04ad)

- Add `specLineCountCache` and `addedPatchLinesCache` to avoid recomputing line counts and parsing patch diffs on every render cycle.
- Wrap all `viewerStore.setState` calls with equality checks so React skips re-renders when the new value matches current state -- this was the primary source of unnecessary DOM thrashing in the spec and diff tabs.
- Extract `getSpecLineCount()` and `getAddedPatchLines()` as pure cached helpers, replacing inline splits and forEach loops.
- Replace `isNaN()` with `Number.isNaN()` for stricter type checking in the hash-based initial commit index parser.

### Spec Evolution Viewer -- Filter Performance

[`888f156`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/888f1562b002acda22ca73a70bcb12dfd89f3c16)

The global filter was building a lowercase search string from `subject + hash + short + author` on every row for every keystroke, causing noticeable lag on large commit datasets.

- Add a pre-lowercased `searchText` field to the `Commit` interface, computed once at load time.
- Replace the multi-field `.toLowerCase().includes()` chain with a single `.includes()` against the cached field.
- Cost reduction: O(1) string allocation at load vs O(n * fields) per filter invocation.

### Spec Evolution Viewer -- Navigation Complexity

[`8368ad8`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8368ad8e9381bf6a8a87f2ee209383921cd84d05)

Navigation actions (prev, next, playback, selection) were calling `filtered.findIndex()` per action -- O(n) across potentially thousands of commits.

- Build a `Map<commitIdx, filteredIdx>` via `useMemo`, updating only when the filtered array changes.
- Replace all five `findIndex()` call sites with O(1) `Map.get()` lookups.

### Spec Evolution Viewer -- Module Loading

[`26c477b`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/26c477b65412022519e97373bd73b731e6eed316)

The viewer was re-importing `marked`, `DOMPurify`, and `diff2html` on every render cycle, creating new module-loading promises each time.

- Cache each dynamic import promise in a module-level singleton using nullish coalescing assignment (`??=`) so `import()` fires once per page lifetime.
- Use `Promise.all()` to load related modules in parallel (marked + DOMPurify together; diff2html + types + DOMPurify together), cutting wall-clock time roughly in half versus sequential awaits.
- Extracted helper functions: `getMarkedModule()`, `getDomPurifyModule()`, `getDiff2HtmlModule()`, `getDiff2HtmlTypesModule()`.

---

## Architecture and Code Quality (2026-02-28)

### Extract Site Configuration Module

[`8416ced`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8416ced625e0bd823dcc009eda2b090efe8fb41a)

Move `siteConfig` and `navItems` from `lib/content.tsx` to a new `lib/site-config.ts` module to break a circular dependency and reduce bundle size for layout/header/footer components that only need site metadata. Original exports preserved as re-exports for backward compatibility.

### Next.js Type Route Path Fix

[`bf59a8e`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bf59a8ec9555a79d4db23f620cb6c23c9a6ef496) _(bundled with beads tracker update)_

Update `next-env.d.ts` path from `.next/dev/types/routes.d.ts` to `.next/types/routes.d.ts` to match the canonical route type generated by the current Next.js version, keeping TypeScript resolution aligned with actual build output.

---

## Bug Fixes (2026-03-16)

### Custom Cursor Corruption by DataDebris Particles

[`13d7dc3`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/13d7dc37a328b9e97badbfbda6cebe20a65f9ff5)

The DataDebris component (floating hex/binary characters near code blocks) passed the shared `mouseX`/`mouseY` MotionValues to each particle via `style={{ x, y }}` while simultaneously animating those same properties with keyframe arrays. Framer-motion's animation engine writes keyframe values directly back into MotionValues supplied via `style`, so five particles were continuously overwriting `mouseX`/`mouseY` with near-zero drift offsets. This caused the custom cursor (outer ring, inner dot, crosshair) to fly off to approximately (0, 0) the instant the mouse entered any `<pre>` or `<code>` element. Because the native cursor is hidden via `cursor: none !important`, the user saw no cursor at all, and it never recovered until a tab switch triggered a document `mouseenter` to reset visibility state.

**Fix:** Wrap all particles in a single `motion.div` container that follows the mouse via `style={{ x, y }}` (read-only MotionValue consumption). Individual particles now use only `style={{ left, top }}` for their offsets, and their `animate={{ x, y }}` keyframes create internal animation values that do not touch the shared MotionValues.

---

## Spring and Summer Refresh (2026-04-10 through 2026-09-22)

- [`ccb3081`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ccb3081f3a74745d07a8556bd488e74dea2ef444) -- Spec viewer filtered navigation uses direct lookup maps.
- [`ac5d33c`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ac5d33cd87678d5aacf003612630833361a1493f), [`de7d6de`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/de7d6dee3d9c1f1b920a77b0302866ddc65ce348), [`292528f`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/292528f5dec21fc9189f288f2220f179448d5d05) -- A large refresh of the landing page, architecture page, OG images, site chrome and visualizations, plus content helpers, hooks and config.
- [`e616fb7`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/e616fb782c2040865ccb612e5950033817a28e3f) -- Playwright and Vitest coverage aligned with the refreshed components.
- [`47a6aab`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/47a6aabaeb39ce83ee4a2b6fa079491420fc8e57) -- Formatting only.
- Repository housekeeping: `.gitignore` patterns ([`c65948a`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/c65948a8017618eec34f225de08f15233ad3920b), [`df57642`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/df5764255813ceac20afffd7f560917d625d7b96)), AGENTS.md updates ([`26000a9`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/26000a9e10545279d0d878283282b618eff40741), [`361cdb7`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/361cdb7a68d64878dbb1f971a7362fe0599f7638)), the changelog itself ([`b9d7719`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b9d7719556e704f0ecef1db8ea03afe5e50aabc1), [`ab2d043`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ab2d043b81ecdc174b5a34c438b15a854fb21355)) and beads metadata ([`d21491f`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/d21491fb6b4f157c0144d7b1272c8f090ffacd2a)).

---

## Engine Sync (2026-10-06 through 2026-10-07)

By October the site described the engine's designs as shipped features and showed an API the engine no longer has. This pass checked every claim against engine v0.4.9 and `main`. Features that are not live keep their place on the site with a status label instead of being deleted.

### Content matches engine v0.4.9

[`b4c5dca`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b4c5dca72619a755e3540e75d1708d0b0770a708), [`86c8015`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/86c8015968ac501dfaacbf996c62bab4d840b307), [`f0502f8`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/f0502f880df0af20da71b2da17efb235bb7b8d55), [`af3a31d`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/af3a31dc6d5da76acc6f4fb2b45831ad50dc5f62), [`8e2615a`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8e2615ad250f0ebda2723a7e4627b664d443fb4e)

- Code examples use the async API on asupersync 0.5. Install instructions cover `install.sh` and `cargo +nightly install fsqlite-cli`.
- 28 workspace crates (26 published). `unsafe` is allowed in `fsqlite-vfs` and `fsqlite-c-api` only, rather than "zero unsafe".
- Plain `BEGIN` is promoted to `BEGIN CONCURRENT` and SSI is on by default. Same-page conflicts return `SQLITE_BUSY_SNAPSHOT`, and each connection commits under a registry guard with no live write coordinator.
- Every feature, comparison cell and architecture topic carries a status: live, partial, built but not wired, or research. RaptorQ recovery, the merge ladder, encryption, native mode and the adaptive indexing work are labeled honestly.
- Interop caveats were added: don't open one file with two engines, `PRAGMA key` is not wired, and RaptorQ symbols go to a `<db>-wal-fec` sidecar that recovery does not read yet.
- Performance numbers were removed until there are current ones. The comparison table gained a Turso column.
- The engine's feature-gated native commit batching service, which landed on `main` the day after v0.4.9, is described as present but not used by ordinary connections.

### Pages restructured around real status

[`ab00858`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ab008580a57aca42216c3b4b0167449a59339e69), [`285b184`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/285b1845d9db1d228cb1f4923d127413502c46e6)

- Homepage: a "Where It Stands" status board linked from the hero, live features first, an "On the workbench" divider before unwired designs, and a "How It Was Built" section.
- Architecture: topics grouped into the live engine, on the bench, research and verification. The query-path flythrough is wired in and models the live read path.
- Getting started: the CLI, the crate, a quickstart, concurrent writers with bounded retries, PRAGMAs, time travel, and a "What not to rely on yet" list.

### Visualizations fact-checked

[`e9db609`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/e9db60996cfe34c65bfbf97acf6c8825a569860f), [`6b595db`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/6b595dbed489cdf9452b2ce5c1a69a967540f94b), [`c16b163`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/c16b163bc6088b0602d98b1b530bd1cda19bff4a), [`abb5d1c`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/abb5d1cee918fd982f8568cfd36985a5a795ecda)

Each demo now models what the engine does: the concurrency demos follow the real commit path, simulated throughput is labeled as simulated, and research and verification demos show their status.

### Hydration and accessibility

[`6413a02`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/6413a02676371ff4b68463b3ce7f55ab496f0600), [`b1af645`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b1af6452533579ff83d16aa8034b21b0c9c7cd67), [`b9cd205`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b9cd205c2e92a436b2a54e4536bb2dfde43a3921)

- Glossary popovers render as spans, ending the `<div>`-inside-`<p>` hydration error.
- Reduced-motion preferences are read through `useSyncExternalStore`, so visitors with reduced motion no longer get hydration failures.
- Navigation landmarks have labels, and the RaptorQ demo's page tiles announce their state.

### Spec evolution viewer

[`a0a0b4f`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/a0a0b4fec646c42dc7c95ff482096633de8692ac), [`925f5f4`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/925f5f4fe6b93af83d584051960dbeb77722b7c8), [`15eb485`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/15eb4854574b1c136d55c336ff8f820001a118ca)

- Three bugs had frozen the spec tab at 8,629 lines on every entry. sql.js in the browser returned no rows for bound parameters, the file-creation patch was applied a second time on top of the base document, and the patch engine inserted a blank line per patch, which shifted every later hunk.
- The dataset was extended from 137 to 144 commits, covering the Feb 25, Aug 3 and Sept 5 spec revisions. Replaying all patches reproduces the engine's current spec (18,232 lines) exactly.
- The diagnostics charts have titles, readable dates and tooltips.

### Tests and docs

[`3fd9996`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/3fd999607098c002c62d4a216231360f0b82e0cc), [`b9cd205`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b9cd205c2e92a436b2a54e4536bb2dfde43a3921)

- README explains how the site stays in sync with the engine.
- The Playwright suite targets the current pages. The spec viewer test loads the real database and checks the replayed line count; before this it passed even when nothing loaded. The suite no longer exempts hydration errors from console checks, and sql.js is served from `node_modules` so it doesn't depend on the CDN.

---

## Issue Tracker Housekeeping (beads)

These commits update the `.beads/issues.jsonl` issue tracker metadata. They carry no production code changes.

| Date | Hash | Summary |
|---|---|---|
| 2026-02-27 | [`d8dc3dc`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/d8dc3dcd525f1d7a5fb56d0708a6cc685a1fd58e) | Sync issue tracker with performance optimization task entries |
| 2026-02-28 | [`bf59a8e`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bf59a8ec9555a79d4db23f620cb6c23c9a6ef496) | Track perf optimization task _(also fixes next-env.d.ts, listed above)_ |
| 2026-02-28 | [`9f572db`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/9f572dbb4100029a9e594a293f2da4bbb21f973d) | Close isomorphic website performance optimization task (bd-k6u) |
| 2026-02-28 | [`c8b2649`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/c8b2649378ac49d7536791b108ea2c7aa742f9cf) | Add filtered navigation optimization task |

---

## Full Commit Index

All 48 commits through b9cd205, in chronological order.

| # | Date | Hash | Type | Summary |
|---|---|---|---|---|
| 1 | 2026-02-26 | [`bb86026`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bb86026297d65000780512cd8730920ed18ffdea) | feat | Establish core website framework and content architecture |
| 2 | 2026-02-26 | [`07c3659`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/07c36596aac06866054e05d2bd6a1fa135f4cde8) | fix | Improve layout, accessibility, and interaction across 5 viz components |
| 3 | 2026-02-26 | [`bd67c8d`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bd67c8d09b07833c77aff32f3ee9baf7c2a1569a) | feat | Add browser-based spec evolution viewer with SQLite-backed patch engine |
| 4 | 2026-02-26 | [`458fe11`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/458fe11f317156e291d671b1d9badd318c579148) | feat | Add package.json, bun.lock, README, and hero illustration |
| 5 | 2026-02-27 | [`87d0317`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/87d0317e1adaadd8d0485dd3c7addbc78deba9e0) | feat | Add GitHub OpenGraph social preview image |
| 6 | 2026-02-27 | [`8848f75`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8848f752ad388e1b162e4df0f85f84681c5e6e63) | perf | Defer heavy visualizations with IntersectionObserver; optimize bundle loading |
| 7 | 2026-02-27 | [`d8dc3dc`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/d8dc3dcd525f1d7a5fb56d0708a6cc685a1fd58e) | chore | Sync issue tracker with performance optimization tasks |
| 8 | 2026-02-28 | [`bf59a8e`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/bf59a8ec9555a79d4db23f620cb6c23c9a6ef496) | chore | Track perf optimization task; fix Next.js type route path |
| 9 | 2026-02-28 | [`8416ced`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8416ced625e0bd823dcc009eda2b090efe8fb41a) | refactor | Extract siteConfig and navItems into dedicated site-config module |
| 10 | 2026-02-28 | [`76fdc4c`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/76fdc4c4086f688d645b0686254b25b7d56ae334) | perf | Cache rendered spec HTML and diff HTML |
| 11 | 2026-02-28 | [`9f572db`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/9f572dbb4100029a9e594a293f2da4bbb21f973d) | chore | Close isomorphic website performance optimization task |
| 12 | 2026-02-28 | [`70ba472`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/70ba472869f6f4ecbc68a02e83375257895b04ad) | perf | Eliminate redundant state updates and cache computed values |
| 13 | 2026-02-28 | [`888f156`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/888f1562b002acda22ca73a70bcb12dfd89f3c16) | perf | Precompute searchText field for filtering |
| 14 | 2026-02-28 | [`8368ad8`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8368ad8e9381bf6a8a87f2ee209383921cd84d05) | perf | Replace O(n) findIndex with Map-based O(1) index |
| 15 | 2026-02-28 | [`c8b2649`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/c8b2649378ac49d7536791b108ea2c7aa742f9cf) | chore | Sync issue tracker -- filtered navigation optimization |
| 16 | 2026-02-28 | [`26c477b`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/26c477b65412022519e97373bd73b731e6eed316) | perf | Cache dynamic imports as singleton promises; parallel loading |
| 17 | 2026-03-16 | [`13d7dc3`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/13d7dc37a328b9e97badbfbda6cebe20a65f9ff5) | fix | Stop DataDebris particles from corrupting shared mouse MotionValues |
| 18 | 2026-03-21 | [`b9d7719`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b9d7719556e704f0ecef1db8ea03afe5e50aabc1) | docs | Add comprehensive CHANGELOG.md documenting project history |
| 19 | 2026-03-21 | [`ab2d043`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ab2d043b81ecdc174b5a34c438b15a854fb21355) | docs | Rebuild CHANGELOG.md from git history with live commit links |
| 20 | 2026-04-10 | [`ccb3081`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ccb3081f3a74745d07a8556bd488e74dea2ef444) | perf | Optimize filtered navigation with direct lookup maps |
| 21 | 2026-04-10 | [`c65948a`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/c65948a8017618eec34f225de08f15233ad3920b) | chore | Add .bv/ and .claude/settings.local.json to .gitignore |
| 22 | 2026-04-11 | [`df57642`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/df5764255813ceac20afffd7f560917d625d7b96) | chore | Add ephemeral/agent-scratch patterns observed during ru sweep |
| 23 | 2026-08-21 | [`26000a9`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/26000a9e10545279d0d878283282b618eff40741) | docs | Require OpenAI File Downloader user-agent on curl/web fetches |
| 24 | 2026-09-21 | [`47a6aab`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/47a6aabaeb39ce83ee4a2b6fa079491420fc8e57) | style | Format layout, sitemap, and shared viz chrome |
| 25 | 2026-09-21 | [`ac5d33c`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ac5d33cd87678d5aacf003612630833361a1493f) | feat | Refresh landing, OG images, and architecture pages |
| 26 | 2026-09-21 | [`de7d6de`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/de7d6dee3d9c1f1b920a77b0302866ddc65ce348) | feat | Update site chrome and frankensqlite viz widgets |
| 27 | 2026-09-21 | [`e616fb7`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/e616fb782c2040865ccb612e5950033817a28e3f) | test | Align Playwright/Vitest coverage with current site components |
| 28 | 2026-09-21 | [`292528f`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/292528f5dec21fc9189f288f2220f179448d5d05) | chore | Update content helpers, hooks, and Next/Playwright config |
| 29 | 2026-09-21 | [`d21491f`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/d21491fb6b4f157c0144d7b1272c8f090ffacd2a) | chore | Add trailing newline to beads metadata |
| 30 | 2026-09-22 | [`361cdb7`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/361cdb7a68d64878dbb1f971a7362fe0599f7638) | docs | Synchronize suite-wide rules and canonical multi-agent conventions |
| 31 | 2026-10-06 | [`b4c5dca`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b4c5dca72619a755e3540e75d1708d0b0770a708) | fix | Sync site with the engine's real status and API |
| 32 | 2026-10-06 | [`86c8015`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/86c8015968ac501dfaacbf996c62bab4d840b307) | fix | Correct footer, OG images and page metadata |
| 33 | 2026-10-06 | [`ab00858`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/ab008580a57aca42216c3b4b0167449a59339e69) | feat | Restructure homepage and architecture page around real status |
| 34 | 2026-10-06 | [`f0502f8`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/f0502f880df0af20da71b2da17efb235bb7b8d55) | fix | Add interop safety caveats and drop live-WAL sharing claims |
| 35 | 2026-10-06 | [`e9db609`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/e9db60996cfe34c65bfbf97acf6c8825a569860f) | fix | Make safety, newtype, VDBE, telemetry and varint demos accurate |
| 36 | 2026-10-06 | [`6b595db`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/6b595dbed489cdf9452b2ce5c1a69a967540f94b) | fix | Make RaptorQ, ECS, storage-mode, encryption and WAL-index demos accurate |
| 37 | 2026-10-06 | [`6413a02`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/6413a02676371ff4b68463b3ce7f55ab496f0600) | fix | Render glossary popovers with spans to stop hydration errors |
| 38 | 2026-10-06 | [`3fd9996`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/3fd999607098c002c62d4a216231360f0b82e0cc) | docs | Explain how the site stays in sync with the engine |
| 39 | 2026-10-06 | [`c16b163`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/c16b163bc6088b0602d98b1b530bd1cda19bff4a) | fix | Make concurrency demos model the engine's real commit path |
| 40 | 2026-10-06 | [`abb5d1c`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/abb5d1cee918fd982f8568cfd36985a5a795ecda) | fix | Label research and verification demos with their real status |
| 41 | 2026-10-06 | [`af3a31d`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/af3a31dc6d5da76acc6f4fb2b45831ad50dc5f62) | fix | Tighten timeline wording to match the record |
| 42 | 2026-10-06 | [`b1af645`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b1af6452533579ff83d16aa8034b21b0c9c7cd67) | fix | Stop hydration failures for reduced-motion visitors |
| 43 | 2026-10-06 | [`a0a0b4f`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/a0a0b4fec646c42dc7c95ff482096633de8692ac) | fix | Make the spec tab actually show each version of the spec |
| 44 | 2026-10-06 | [`925f5f4`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/925f5f4fe6b93af83d584051960dbeb77722b7c8) | feat | Extend the dataset through the Sept 2026 spec revisions |
| 45 | 2026-10-06 | [`285b184`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/285b1845d9db1d228cb1f4923d127413502c46e6) | feat | Wire in the query-path flythrough; link hero to status |
| 46 | 2026-10-06 | [`15eb485`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/15eb4854574b1c136d55c336ff8f820001a118ca) | fix | Label the diagnostics charts and make their tooltips useful |
| 47 | 2026-10-06 | [`8e2615a`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/8e2615ad250f0ebda2723a7e4627b664d443fb4e) | docs | Note the native commit batching service that landed on main |
| 48 | 2026-10-07 | [`b9cd205`](https://github.com/Dicklesworthstone/frankensqlite_website/commit/b9cd205c2e92a436b2a54e4536bb2dfde43a3921) | test | Realign the Playwright suite with the current pages |
