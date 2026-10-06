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
