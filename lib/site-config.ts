export const siteConfig = {
  name: "FrankenSQLite",
  title: "FrankenSQLite — SQLite, Rebuilt in Rust for Concurrent Writers",
  description:
    "A from-scratch Rust implementation of SQLite that opens your existing database files and lets several connections write at once, using page-level MVCC with serializable isolation.",
  url: "https://frankensqlite.com",
  github: "https://github.com/Dicklesworthstone/frankensqlite",
  social: {
    github: "https://github.com/Dicklesworthstone/frankensqlite",
    x: "https://x.com/doodlestein",
    authorGithub: "https://github.com/Dicklesworthstone",
  },
} as const;

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/showcase", label: "Showcase" },
  { href: "/architecture", label: "Architecture" },
  { href: "/spec_evolution", label: "Spec Evolution" },
  { href: "/getting-started", label: "Get Started" },
] as const;

/**
 * The engine release this site describes. Every status claim on the site
 * should match the engine repository at this version; update the two
 * together.
 */
export const engineSnapshot = {
  version: "0.4.9",
  releasedOn: "October 3, 2026",
  checkedOn: "October 6, 2026",
  sqliteTarget: "3.52.0",
  workspaceCrates: 28,
  publishedCrates: 26,
  firstCommit: "February 6, 2026",
  releaseUrl: "https://github.com/Dicklesworthstone/frankensqlite/releases/tag/v0.4.9",
  changelogUrl: "https://github.com/Dicklesworthstone/frankensqlite/blob/main/CHANGELOG.md",
  readmeStatusUrl:
    "https://github.com/Dicklesworthstone/frankensqlite#current-implementation-status",
  concurrencyContractUrl:
    "https://github.com/Dicklesworthstone/frankensqlite/blob/main/docs/concurrency-contract.md",
  negativeLedgerUrl:
    "https://github.com/Dicklesworthstone/frankensqlite/blob/main/docs/progress/perf-negative-results.md",
  specUrl:
    "https://github.com/Dicklesworthstone/frankensqlite/blob/main/docs/planning/COMPREHENSIVE_SPEC_FOR_FRANKENSQLITE_V1.md",
} as const;
