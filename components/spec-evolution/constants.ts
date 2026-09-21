import type { Bucket } from "./types";

export const DB_FILENAME = "spec_evolution_v1.sqlite3";

export const BUCKETS: Bucket[] = [
  {
    id: 1,
    name: "Logic/Math",
    color: "#39ff14",
    desc: "Fixing outright mistakes in logic, math, or reasoning.",
  },
  {
    id: 2,
    name: "Legacy SQLite",
    color: "#adff2f",
    desc: "Fixing inaccurate statements about the existing sqlite legacy codebase.",
  },
  {
    id: 3,
    name: "Asupersync",
    color: "#00ff00",
    desc: "Fixing inaccurate statements about the existing asupersync library codebase.",
  },
  {
    id: 4,
    name: "Architecture",
    color: "#ff003c",
    desc: "Fixing conceptual errors or architectural mistakes.",
  },
  {
    id: 5,
    name: "Ministerial",
    color: "#71717a",
    desc: "Ministerial/scrivening fixes (e.g., renumbering properly, fixing references, etc).",
  },
  {
    id: 6,
    name: "Context",
    color: "#d946ef",
    desc: "Addition of extra background information or context to make the spec more self-contained and complete.",
  },
  {
    id: 7,
    name: "Engineering",
    color: "#06b6d4",
    desc: "Improvements to the spec based on standard computer engineering concepts.",
  },
  {
    id: 8,
    name: "Alien Artifact",
    color: "#8b5cf6",
    desc: "Improvements based on the 'alien artifact' approach: advanced math rarely seen in applied CS.",
  },
  {
    id: 9,
    name: "Clarification",
    color: "#14b8a6",
    desc: "Further elaboration or clarification of what is already there without substantive changes.",
  },
  {
    id: 10,
    name: "General/Other",
    color: "#52525b",
    desc: "A generic catch-all for changes that don't fit the preceding 9 categories.",
  },
];
