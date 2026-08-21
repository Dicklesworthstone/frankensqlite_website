# AGENTS.md — FrankenSQLite Website

## RULE NUMBER 1 (NEVER EVER EVER FORGET THIS RULE!!!)

**YOU ARE NEVER ALLOWED TO DELETE A FILE WITHOUT EXPRESS PERMISSION FROM ME OR A DIRECT COMMAND FROM ME.**

Even a new file that you yourself created, such as a test code file. You have a horrible track record of deleting critically important files or otherwise throwing away tons of expensive work that I then need to pay to reproduce.

As a result, you have permanently lost any and all rights to determine that a file or folder should be deleted. You must **ALWAYS** ask and *receive* clear, written permission from me before ever even thinking of deleting a file or folder of any kind!

---

## IRREVERSIBLE GIT & FILESYSTEM ACTIONS — DO-NOT-EVER BREAK GLASS

1. **Absolutely forbidden commands:** `git reset --hard`, `git clean -fd`, `rm -rf`, or any command that can delete or overwrite code/data must never be run unless the user explicitly provides the exact command and states, in the same message, that they understand and want the irreversible consequences.

2. **No guessing:** If there is any uncertainty about what a command might delete or overwrite, stop immediately and ask the user for specific approval. "I think it's safe" is never acceptable.

3. **Safer alternatives first:** When cleanup or rollbacks are needed, request permission to use non-destructive options (`git status`, `git diff`, `git stash`, copying to backups) before ever considering a destructive command.

4. **Mandatory explicit plan:** Even after explicit user authorization, restate the command verbatim, list exactly what will be affected, and wait for a confirmation that your understanding is correct. Only then may you execute it — if anything remains ambiguous, refuse and escalate.

5. **Document the confirmation:** When running any approved destructive command, record (in the session notes / final response) the exact user text that authorized it, the command actually run, and the execution time. If that record is absent, the operation did not happen.

---

## Project Overview

This is the **FrankenSQLite marketing and documentation website** — a Next.js site for FrankenSQLite, a clean-room Rust reimplementation of SQLite with MVCC concurrency, RaptorQ self-healing storage, and zero unsafe code across a 26-crate workspace.

**Live Site:** https://frankensqlite.com

**Engine Source:** https://github.com/Dicklesworthstone/frankensqlite

This is **NOT** a personal site. It is a product marketing site with interactive documentation, architecture deep dives, and a spec evolution viewer.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19.2.4, TypeScript (strict mode) |
| Styling | Tailwind CSS 4, tailwind-merge, clsx |
| Animations | framer-motion 12 |
| Charts | echarts 6 |
| In-browser SQLite | sql.js 1.14 |
| Markdown | marked 17 |
| Diff viewer | diff2html 3 |
| Sanitization | dompurify 3 |
| Date formatting | dayjs |
| Icons | lucide-react |
| Dev server | Turbopack (`next dev --turbopack`) |
| Package Manager | **bun** (NEVER npm, yarn, or pnpm) |
| Deployment | Vercel |

**NOT in the stack** (do NOT add or reference these):
- Three.js / @react-three/fiber / @react-three/drei
- Fuse.js
- gray-matter
- rehype / remark / react-markdown
- KaTeX
- GSAP

---

## Package Manager — BUN ONLY

We **only** use `bun` in this project. NEVER use `npm`, `yarn`, or `pnpm`.

```bash
# Install dependencies
bun install

# Run dev server (uses Turbopack)
bun dev

# Build for production
bun run build

# Run linting
bun lint

# Run type checking
bun tsc --noEmit
```

Dependencies are managed **exclusively** via `package.json` + `bun.lock`. Do **not** introduce `package-lock.json`, `yarn.lock`, or any other lockfiles.

---

## Code Editing Discipline

**NEVER** run a script that processes/changes code files in this repo. No "code mods" you just invented, no giant regex-based `sed` one-liners, no auto-refactor scripts that touch large parts of the tree.

That sort of brittle, regex-based stuff is always a huge disaster and creates far more problems than it ever solves.

* If many changes are needed but they're **mechanical**, use several subagents in parallel to make the edits, but still apply them **manually** and review diffs.
* If changes are **subtle or complex**, you must methodically do them yourself, carefully, file by file.

---

## Backwards Compatibility & File Sprawl

We do **not** care about backwards compatibility — we want the cleanest possible architecture with **zero tech debt**:

* Do **not** create "compatibility shims".
* Do **not** keep old APIs around just in case. Migrate callers and delete the old API (subject to the no-deletion rule for files; code removal inside a file is fine).

**AVOID** uncontrolled proliferation of code files:

* If you want to change something or add a feature, you MUST revise the **existing** code file in place.
* You may NEVER create files like `componentV2.tsx`, `componentImproved.tsx`, `componentNew.tsx`, etc.
* New code files are reserved for **genuinely new domains** that make no sense to fold into any existing module.
* The bar for adding a new file should be **incredibly high**.

---

## Project Structure

```
├── app/                         # Next.js App Router pages
│   ├── layout.tsx              # Root layout with metadata, fonts, ClientShell
│   ├── page.tsx                # Homepage ("use client") — hero, stats, features, gallery, comparison, code, crates, timeline, CTA
│   ├── architecture/page.tsx   # Architecture deep dive (server component) — 6 layers, MVCC, RaptorQ, 26 crates
│   ├── getting-started/page.tsx# Installation, quickstart, CLI usage, FAQ
│   ├── showcase/page.tsx       # Screenshot gallery
│   ├── spec_evolution/page.tsx # Spec evolution viewer loader (delegates to viewer component)
│   ├── globals.css             # Global styles, Tailwind imports
│   ├── not-found.tsx           # 404 page
│   ├── icon.tsx                # Dynamic favicon
│   ├── apple-icon.tsx          # Apple touch icon
│   ├── opengraph-image.tsx     # OG image generation
│   └── twitter-image.tsx       # Twitter card image
├── components/                  # React components
│   ├── client-shell.tsx        # App shell — wraps all pages (SiteProvider, header, footer, cursor, transitions)
│   ├── site-header.tsx         # Desktop floating nav + mobile bottom nav
│   ├── site-footer.tsx         # Footer with links and credits
│   ├── franken-elements.tsx    # Design system: Bolt, Stitch, NeuralPulse, FrankenContainer
│   ├── franken-eye.tsx         # Animated eye component
│   ├── franken-glitch.tsx      # Glitch text effect
│   ├── rust-code-block.tsx     # Custom Rust syntax highlighter (no external highlighter)
│   ├── feature-card.tsx        # Feature card with icon
│   ├── comparison-table.tsx    # Engine comparison table
│   ├── screenshot-gallery.tsx  # Lightbox screenshot gallery
│   ├── section-shell.tsx       # Reusable section wrapper with eyebrow/title/kicker
│   ├── stats-grid.tsx          # Animated stats grid
│   ├── timeline.tsx            # Development timeline
│   ├── glow-orbits.tsx         # Background glow animation
│   ├── motion-wrapper.tsx      # Magnetic and BorderBeam wrappers
│   ├── animated-number.tsx     # Number animation component
│   ├── custom-cursor.tsx       # Custom cursor effect
│   ├── signal-hud.tsx          # Signal HUD overlay
│   ├── scroll-to-top.tsx       # Scroll-to-top button
│   ├── error-boundary.tsx      # React error boundary
│   └── spec-evolution/         # Spec evolution viewer subsystem
│       ├── viewer.tsx          # ~1100 line interactive spec viewer (sql.js, echarts, diff2html)
│       ├── viewer.css          # Viewer-specific styles
│       ├── viewer-loader.tsx   # Dynamic import wrapper for the viewer
│       ├── patch-engine.ts     # Custom unified diff patcher
│       ├── constants.ts        # Viewer configuration constants
│       └── types.ts            # TypeScript types for spec evolution data
├── lib/                         # Utilities and data
│   ├── content.ts              # ALL static content (site config, nav, stats, features, crates, comparison, code example, changelog, screenshots, FAQ)
│   ├── site-state.tsx          # SiteProvider context (anatomy mode toggle + Web Audio API sound effects)
│   └── utils.ts                # cn() utility, formatDate, noise SVG, isTextInputLike
├── hooks/                       # Custom React hooks
│   ├── use-body-scroll-lock.ts # Body scroll locking for modals
│   └── use-intersection-observer.ts # Intersection observer hook
├── types/                       # TypeScript declarations
│   └── sql.js.d.ts             # Type declarations for sql.js
├── public/                      # Static assets
│   ├── images/                 # WebP images (architecture diagram, illustration, screenshots)
│   └── spec_evolution_v1.sqlite3  # SQLite database loaded in-browser by spec evolution viewer
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript config (strict mode)
├── postcss.config.mjs           # PostCSS config for Tailwind
├── eslint.config.mjs            # ESLint 9 flat config
├── package.json                 # Dependencies and scripts
└── bun.lock                     # Bun lockfile
```

---

## Pages (5 Routes)

| Route | Rendering | Description |
|-------|-----------|-------------|
| `/` | Client (`"use client"`) | Homepage — hero with architecture diagram, animated stats, feature cards, screenshot gallery preview, engine comparison table, Rust code example, 26-crate grid, development timeline, CTA, author credit |
| `/architecture` | Server component | Architecture deep dive — 6 named layers (Foundation, Storage, Concurrency & Durability, SQL Engine, Extensions, Integration), crate catalog, architecture diagram |
| `/getting-started` | Server component | Installation guide, `cargo add fsqlite`, quickstart code, CLI usage, FAQ accordion |
| `/showcase` | Server component | Full screenshot gallery with lightbox |
| `/spec_evolution` | Server (loads client viewer) | Interactive spec evolution viewer — loads `spec_evolution_v1.sqlite3` in-browser via sql.js, shows diff viewer (diff2html), charts (echarts), and markdown rendering (marked) |

---

## Key Components & Patterns

### Content Management

All site content lives in `lib/content.ts`:

* **Site Config:** Name, title, description, URL, GitHub, social links
* **Navigation:** Route definitions
* **Hero Stats:** Key metrics (26 crates, 8x writers, 0 unsafe, 100% SQL)
* **Features:** Array of feature objects with title, description, icon
* **Crates:** All 26 workspace crates with names and descriptions
* **Comparison Data:** Feature comparison table (FrankenSQLite vs C SQLite vs sqlx vs diesel)
* **Code Example:** Rust quickstart code
* **Changelog:** Development timeline phases
* **Screenshots:** Gallery items
* **FAQ:** Question/answer pairs

When adding or modifying content, edit `lib/content.ts` directly — do NOT create separate data files. There is no CMS, no markdown files for content, and no blog.

### Design System

The Frankenstein-themed design system is implemented in `components/franken-elements.tsx`:

* **FrankenContainer** — Glass-morphism card with optional bolts, stitches, and neural pulse animations
* **Bolt** — Decorative bolt element positioned at corners
* **Stitch** — Animated stitch line between sections
* **NeuralPulse** — Pulsing neural network animation overlay

Design tokens:
* Dark background: `#020a05`
* Teal accent: `#14b8a6`
* Glass-morphism: `bg-white/[0.02]` with `backdrop-blur`
* Noise texture: SVG data URI overlay (defined in `lib/utils.ts`)

### Custom Rust Syntax Highlighter

`components/rust-code-block.tsx` contains a hand-built Rust tokenizer — no external syntax highlighting library is used. It tokenizes keywords, types, strings, comments, attributes, lifetimes, and numbers.

### Spec Evolution Viewer

The spec evolution system lives in `components/spec-evolution/`:

* Loads `/public/spec_evolution_v1.sqlite3` in the browser via sql.js (WebAssembly)
* Renders diffs with diff2html
* Shows charts with echarts
* Renders markdown with marked (sanitized by dompurify)
* Has a custom unified diff patcher (`patch-engine.ts`)
* The `/spec_evolution` route renders full-viewport (no header/footer) — see `client-shell.tsx`

### Site State (SiteProvider)

`lib/site-state.tsx` provides a React context with:

* **Anatomy Mode** — Toggled with `Ctrl+Shift+X`; adds debug outlines, grid overlay, and scanline effects
* **Audio** — Web Audio API sound effects (click, zap, hum, error) using oscillator synthesis
* The `useSite()` hook gives access to `isAnatomyMode`, `toggleAnatomyMode`, `isAudioEnabled`, `toggleAudio`, `playSfx`

### Client Shell

`components/client-shell.tsx` is the app-level wrapper:

* Wraps all content in `SiteProvider` and `ErrorBoundary`
* Standard pages get: `SiteHeader`, `SiteFooter`, `CustomCursor`, `SignalHUD`, `ScrollToTop`, and `AnimatePresence` page transitions
* The `/spec_evolution` route gets a minimal wrapper (no header/footer) for full-viewport display
* Respects `prefers-reduced-motion` via framer-motion's `useReducedMotion`

---

## Static Analysis & Type Safety

**CRITICAL:** After any substantive changes to TypeScript/React code, verify no lint or type errors:

```bash
# Type-check (no emit)
bun tsc --noEmit

# Lint
bun lint
```

If there are errors:
* Read enough context around each one to understand the *real* problem.
* Fix issues at the root cause rather than just silencing rules.
* Re-run until clean.

---

## Deployment (Vercel)

The site deploys automatically to Vercel on push to `main`.

**Before pushing:**
1. Ensure `bun run build` succeeds locally
2. Check for TypeScript errors with `bun tsc --noEmit`
3. Verify the dev server works: `bun dev`

**Vercel Configuration:**
* Framework: Next.js
* Build Command: `bun run build`
* Install Command: `bun install`
* Output Directory: `.next`

---

## Issue Tracking with br (beads_rust)

**IMPORTANT**: This project uses **br (beads_rust)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

**Note:** `br` is non-invasive and never executes git commands. After syncing, you must manually commit the `.beads/` directory.

**CRITICAL GIT RULE**: The `.beads/` directory contains issue tracking state and **MUST ALWAYS BE COMMITTED** with code changes. When committing code changes, you MUST also commit the corresponding `.beads/` files in the same commit to keep issue state synchronized with code state.

**NEVER FORGET THIS**: The ONLY allowed way to interact with beads is via the `br` command. DO NOT TRY TO DIRECTLY READ, CREATE, OR MODIFY BEADS BY MODIFYING JSON OR JSONL FILES. ONLY VIA `br`!

### Why br?

* Dependency-aware: Track blockers and relationships between issues.
* Git-friendly: Exports to JSONL for version control.
* Agent-optimized: JSON output, ready work detection, discovered-from links.
* Prevents duplicate tracking systems and confusion.

### Quick Start

```bash
# Check for ready work
br ready --json

# Create new issues
br create "Issue title" -t bug|feature|task -p 0-4 --json
br create "Issue title" -p 1 --deps discovered-from:br-123 --json

# Claim and update
br update br-42 --status in_progress --json
br update br-42 --priority 1 --json

# Complete work
br close br-42 --reason "Completed" --json

# View statistics
br stats
```

### Issue Types

* `bug` - Something broken
* `feature` - New functionality
* `task` - Work item (tests, docs, refactoring)
* `epic` - Large feature with subtasks
* `chore` - Maintenance (dependencies, tooling)

### Priorities

* `0` - Critical (security, broken builds)
* `1` - High (major features, important bugs)
* `2` - Medium (default, nice-to-have)
* `3` - Low (polish, optimization)
* `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `br ready` shows unblocked issues.
2. **Claim your task**: `br update <id> --status in_progress`.
3. **Work on it**: Implement, test, document.
4. **Discover new work?** Create linked issue:
   * `br create "Found bug" -p 1 --deps discovered-from:<parent-id>`.
5. **Complete**: `br close <id> --reason "Done"`.
6. **Sync**: `br sync --flush-only` then manually `git add .beads/ && git commit`.

### Important Rules

* Use br for ALL task tracking
* Always use `--json` flag for programmatic use
* Link discovered work with `discovered-from` dependencies
* Check `br ready` before asking "what should I work on?"
* Do NOT create markdown TODO lists
* Do NOT use external issue trackers
* Do NOT duplicate tracking systems

---

## Using bv as an AI sidecar

`bv` is a fast terminal UI for Beads projects. For agents, it's a graph sidecar that provides dependency-aware outputs.

**IMPORTANT: As an agent, you must ONLY use bv with the robot flags, otherwise you'll get stuck in the interactive TUI!**

```bash
bv --robot-help          # Shows all AI-facing commands
bv --robot-insights      # JSON graph metrics (PageRank, critical path, cycles)
bv --robot-plan          # JSON execution plan with parallel tracks
bv --robot-priority      # JSON priority recommendations with reasoning
bv --robot-recipes       # List recipes (actionable, blocked, etc.)
```

---

## ast-grep vs ripgrep

**Use `ast-grep` when structure matters.** It parses code and matches AST nodes, so results ignore comments/strings, understand syntax, and can safely rewrite code.

**Use `ripgrep` when text is enough.** It's the fastest way to grep literals/regex across files.

**Rule of thumb:**
* Need correctness or you'll **apply changes** → start with `ast-grep`
* Need raw speed or just **hunting text** → start with `rg`

```bash
# Find structured code (ignores comments/strings)
ast-grep run -l TypeScript -p 'import $X from "$P"'

# Codemod
ast-grep run -l JavaScript -p 'var $A = $B' -r 'let $A = $B' -U

# Quick textual hunt
rg -n 'console\.log\(' -t ts
```

---

## UBS Quick Reference

UBS (Ultimate Bug Scanner) flags likely bugs before they become problems.

**Golden Rule:** `ubs <changed-files>` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

```bash
ubs file.ts file2.ts                    # Specific files (< 1s)
ubs $(git diff --name-only --cached)    # Staged files
ubs --only=ts,tsx components/           # Language filter
ubs .                                   # Whole project
```

**Output Format:**
```text
⚠️  Category (N errors)
    file.ts:42:5 – Issue description
    💡 Suggested fix
Exit code: 1
```

**Fix Workflow:**
1. Read finding → category + fix suggestion
2. Navigate `file:line:col` → view context
3. Verify real issue (not false positive)
4. Fix root cause (not symptom)
5. Re-run `ubs <file>` → exit 0
6. Commit

---

## cass — Search Agent History

`cass` indexes conversations from Claude Code, Codex, Cursor, and more into a searchable index. Before solving a problem from scratch, check if any agent already solved something similar.

**NEVER run bare `cass` — it launches an interactive TUI. Always use `--robot` or `--json`.**

```bash
# Check index health
cass health

# Search across all agent histories
cass search "spec evolution viewer" --robot --limit 5

# View a specific result
cass view /path/to/session.jsonl -n 42 --json

# Feature discovery
cass capabilities --json
```

---

## Common Tasks

### Modifying Site Content

Edit `lib/content.ts` directly. This file contains all static content: site config, navigation, stats, features, crates, comparison data, code examples, timeline, screenshots, and FAQ. There is no CMS and no markdown content files.

### Adding a Screenshot

1. Add the WebP image to `public/images/`
2. Add an entry to the `screenshots` array in `lib/content.ts`

### Adding a New Page

1. Create `app/new-page/page.tsx`
2. Add navigation entry to `navItems` in `lib/content.ts`
3. Navigation will automatically appear in `components/site-header.tsx` (it reads from `navItems`)

### Modifying the Design System

Edit `components/franken-elements.tsx` for structural design elements (Bolt, Stitch, NeuralPulse, FrankenContainer). Edit `app/globals.css` for global CSS variables and utility classes.

### Working with the Spec Evolution Viewer

The viewer subsystem is in `components/spec-evolution/`. The main component is `viewer.tsx` (~1100 lines). It:
- Loads the SQLite database from `/public/spec_evolution_v1.sqlite3`
- Uses sql.js (WebAssembly) for in-browser querying
- Renders diffs with diff2html
- Renders charts with echarts
- Uses a custom patch engine (`patch-engine.ts`) for applying unified diffs

---

## Performance Considerations

### Core Web Vitals

* **LCP:** Hero image has `priority` prop for immediate loading
* **CLS:** All images specify explicit width/height
* **INP:** Animations respect `prefers-reduced-motion`; heavy components use dynamic imports

### Bundle Size

* Use dynamic imports for heavy components (spec evolution viewer, echarts)
* The spec evolution viewer is dynamically imported via `viewer-loader.tsx`
* sql.js loads its WASM binary at runtime, not bundled
* Analyze with `ANALYZE=true bun run build` (if configured)

---

## Accessibility

* Skip link at top of page for keyboard navigation (`<a href="#main-content" className="skip-link">`)
* All interactive elements need visible focus states
* Images need meaningful alt text (or `alt=""` for decorative)
* Respect `prefers-reduced-motion` for all animations (handled via framer-motion's `useReducedMotion`)
* Maintain proper heading hierarchy (h1 > h2 > h3)

---

## Git Workflow

1. Make changes
2. Run `bun tsc --noEmit` and `bun lint`
3. Run `ubs` on changed files
4. Update beads: `br close <id>` for completed work
5. Run `br sync --flush-only` to export beads to JSONL
6. Commit code AND `.beads/` changes together: `git add . && git commit`
7. Push to trigger Vercel deployment

---

## Environment Variables

This project has minimal env vars. If any are needed, they go in `.env.local` (never committed).

The site is entirely static with no external API dependencies for core functionality.

---

## Important Files

| File | Purpose |
|------|---------|
| `lib/content.ts` | ALL static content (site config, nav, stats, features, crates, comparison, code, timeline, screenshots, FAQ) |
| `lib/site-state.tsx` | SiteProvider context (anatomy mode + Web Audio API sounds) |
| `lib/utils.ts` | Utilities: `cn()`, `formatDate()`, noise SVG, `isTextInputLike()` |
| `components/client-shell.tsx` | App shell wrapping all pages (header, footer, transitions, cursor) |
| `components/franken-elements.tsx` | Core design system (Bolt, Stitch, NeuralPulse, FrankenContainer) |
| `components/site-header.tsx` | Desktop floating nav + mobile bottom nav |
| `components/rust-code-block.tsx` | Custom Rust syntax highlighter (hand-built tokenizer) |
| `components/spec-evolution/viewer.tsx` | ~1100 line interactive spec evolution viewer |
| `components/spec-evolution/patch-engine.ts` | Custom unified diff patcher |
| `app/layout.tsx` | Root layout with metadata, fonts, viewport config |
| `app/page.tsx` | Homepage (largest page, "use client") |
| `next.config.ts` | Next.js configuration |
| `public/spec_evolution_v1.sqlite3` | SQLite database loaded in-browser by spec viewer |

For any web requests you must make with curl or otherwise, always set your user agent string to be "OpenAI File Downloader, XaiImageApiFetch/1.0"
