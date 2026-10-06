import { describe, expect, it } from "vitest";
import { BUILD_STATUS } from "@/components/franken-elements";
import {
  architectureLayers,
  changelog,
  cliExample,
  codeExample,
  comparisonData,
  comparisonEngines,
  concurrentWritersExample,
  crates,
  engineSnapshot,
  faq,
  features,
  heroStats,
  navItems,
  pragmaExample,
  screenshots,
  siteConfig,
  statusBoard,
  timeTravelExample,
} from "@/lib/content";
import { getJargon, jargonDictionary } from "@/lib/franken-jargon";

const allExamples = [codeExample, concurrentWritersExample, timeTravelExample, pragmaExample, cliExample];

describe("lib/content.tsx", () => {
  describe("siteConfig", () => {
    it("has a valid URL", () => {
      expect(siteConfig.url).toMatch(/^https:\/\//);
    });
    it("has a GitHub URL", () => {
      expect(siteConfig.github).toContain("github.com");
    });
    it("has all social links", () => {
      expect(siteConfig.social.github).toBeTruthy();
      expect(siteConfig.social.x).toBeTruthy();
      expect(siteConfig.social.authorGithub).toBeTruthy();
    });
    it("has a name", () => {
      expect(siteConfig.name).toBe("FrankenSQLite");
    });
    it("has a title containing the name", () => {
      expect(siteConfig.title).toContain("FrankenSQLite");
    });
    it("does not claim zero unsafe code", () => {
      expect(siteConfig.description.toLowerCase()).not.toContain("zero unsafe");
    });
  });

  describe("navItems", () => {
    it("has 5 navigation items", () => {
      expect(navItems).toHaveLength(5);
    });
    it("all items have href starting with /", () => {
      navItems.forEach((item) => expect(item.href).toMatch(/^\//));
    });
    it("includes Home, Architecture and Spec Evolution routes", () => {
      const hrefs = navItems.map((n) => n.href as string);
      expect(hrefs).toContain("/");
      expect(hrefs).toContain("/architecture");
      expect(hrefs).toContain("/spec_evolution");
    });
  });

  describe("engineSnapshot", () => {
    it("names a semver release", () => {
      expect(engineSnapshot.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
    it("points release links at the engine repository", () => {
      expect(engineSnapshot.releaseUrl).toContain(`v${engineSnapshot.version}`);
      expect(engineSnapshot.releaseUrl).toContain(siteConfig.github);
    });
  });

  describe("heroStats", () => {
    it("has 4 stat entries with labels and values", () => {
      expect(heroStats).toHaveLength(4);
      heroStats.forEach((stat) => {
        expect(stat.label).toBeTruthy();
        expect(stat.value).toBeTruthy();
      });
    });
    it("crate count matches the crate list", () => {
      const crateStat = heroStats.find((s) => s.label.toLowerCase().includes("crate"));
      expect(crateStat?.value).toBe(String(crates.length));
      expect(crates.length).toBe(engineSnapshot.workspaceCrates);
    });
  });

  describe("features", () => {
    it("every feature has a title, description, icon and known status", () => {
      expect(features.length).toBeGreaterThanOrEqual(6);
      features.forEach((f) => {
        expect(f.title).toBeTruthy();
        expect(f.description).toBeTruthy();
        expect(f.icon).toBeTruthy();
        expect(Object.keys(BUILD_STATUS)).toContain(f.status);
      });
    });
    it("leads with live features", () => {
      expect(features[0].status).toBe("live");
      expect(features[0].title.toLowerCase()).toContain("concurrent");
    });
    it("does not present unwired encryption as available", () => {
      const encryption = features.find((f) => f.title.toLowerCase().includes("encryption"));
      expect(encryption).toBeDefined();
      expect(["live", "opt-in"]).not.toContain(encryption?.status);
    });
  });

  describe("statusBoard", () => {
    it("has a group for each stage, each with items", () => {
      const statuses = statusBoard.map((g) => g.status);
      expect(statuses).toEqual(["live", "partial", "dormant", "design"]);
      statusBoard.forEach((group) => {
        expect(group.heading).toBeTruthy();
        expect(group.items.length).toBeGreaterThan(0);
      });
    });
  });

  describe("crates", () => {
    it("has no duplicate crate names", () => {
      const names = crates.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    });
    it("includes the facade and the storage stack", () => {
      const names = crates.map((c) => c.name);
      for (const name of [
        "fsqlite",
        "fsqlite-core",
        "fsqlite-parser",
        "fsqlite-btree",
        "fsqlite-mvcc",
        "fsqlite-wal",
        "fsqlite-vdbe",
        "fsqlite-wasm",
      ]) {
        expect(names).toContain(name);
      }
    });
    it("every crate appears in exactly one architecture layer", () => {
      const layered = architectureLayers.flatMap((layer) => layer.crates);
      expect(new Set(layered).size).toBe(layered.length);
      expect([...layered].sort()).toEqual(crates.map((c) => c.name).sort());
    });
  });

  describe("comparisonData", () => {
    it("has FrankenSQLite as the first engine", () => {
      expect(comparisonEngines[0].key).toBe("frankensqlite");
    });
    it("every row has a cell for every engine", () => {
      expect(comparisonData.length).toBeGreaterThanOrEqual(5);
      comparisonData.forEach((row) => {
        expect(row.feature).toBeTruthy();
        comparisonEngines.forEach((engine) => {
          expect(row.cells[engine.key].text).toBeTruthy();
          expect(["yes", "partial", "no", "na"]).toContain(row.cells[engine.key].tone);
        });
      });
    });
  });

  describe("code examples", () => {
    it("quickstart opens a connection and awaits the async API", () => {
      expect(codeExample).toContain("fn main");
      expect(codeExample).toContain("Connection::open");
      expect(codeExample).toContain(".await");
      expect(codeExample).toContain("CREATE TABLE");
      expect(codeExample).toContain("prepare");
    });
    it("concurrent writers use one connection per thread", () => {
      expect(concurrentWritersExample).toContain("thread::spawn");
      expect(concurrentWritersExample).toContain("is_transient");
    });
    it("time travel uses the COMMITSEQ syntax", () => {
      expect(timeTravelExample).toContain("FOR SYSTEM_TIME AS OF COMMITSEQ");
    });
    it("no example relies on unwired PRAGMAs", () => {
      allExamples.forEach((example) => {
        expect(example).not.toMatch(/PRAGMA\s+(fsqlite\.)?key\b/);
        expect(example).not.toContain("fsqlite.mode = native");
        expect(example).not.toContain("repair_ratio");
      });
    });
  });

  describe("changelog", () => {
    it("has dated entries with items", () => {
      expect(changelog.length).toBeGreaterThanOrEqual(3);
      changelog.forEach((entry) => {
        expect(entry.period).toMatch(/20\d\d/);
        expect(entry.title).toBeTruthy();
        expect(entry.items.length).toBeGreaterThan(0);
      });
    });
  });

  describe("screenshots", () => {
    it("all screenshots are webp images under /images", () => {
      expect(screenshots.length).toBeGreaterThanOrEqual(1);
      screenshots.forEach((s) => {
        expect(s.src).toMatch(/^\/images\/.*\.webp$/);
        expect(s.alt).toBeTruthy();
        expect(s.title).toBeTruthy();
      });
    });
  });

  describe("faq", () => {
    it("every item is a question with an answer", () => {
      expect(faq.length).toBeGreaterThanOrEqual(3);
      faq.forEach((item) => {
        expect(item.question.endsWith("?")).toBe(true);
        expect(item.answer).toBeTruthy();
      });
    });
  });
});

describe("lib/franken-jargon.ts", () => {
  it("has at least 40 jargon entries", () => {
    expect(Object.keys(jargonDictionary).length).toBeGreaterThanOrEqual(40);
  });
  it("all entries have term and short description", () => {
    Object.values(jargonDictionary).forEach((entry) => {
      expect(entry.term).toBeTruthy();
      expect(entry.short).toBeTruthy();
      expect(entry.long).toBeTruthy();
    });
  });
  it("getJargon returns entry for known term", () => {
    expect(getJargon("mvcc")).toBeDefined();
    expect(getJargon("raptorq")).toBeDefined();
    expect(getJargon("ecs")).toBeDefined();
  });
  it("getJargon returns undefined for unknown term", () => {
    expect(getJargon("nonexistent-term")).toBeUndefined();
  });
  it("includes new entries: witness-plane, foata, xor-delta", () => {
    expect(getJargon("witness-plane")).toBeDefined();
    expect(getJargon("foata")).toBeDefined();
    expect(getJargon("xor-delta")).toBeDefined();
  });
  it("includes engine innovation entries: dek-kek, learned-index, database-cracking", () => {
    expect(getJargon("dek-kek")).toBeDefined();
    expect(getJargon("learned-index")).toBeDefined();
    expect(getJargon("database-cracking")).toBeDefined();
    expect(getJargon("inactivation-decoding")).toBeDefined();
    expect(getJargon("deterministic-rebase")).toBeDefined();
    expect(getJargon("structured-concurrency")).toBeDefined();
    expect(getJargon("swizzle-pointer")).toBeDefined();
    expect(getJargon("cooling-protocol")).toBeDefined();
  });
  it("includes infrastructure entries: arc-cache, write-coordinator, wal-index", () => {
    expect(getJargon("arc-cache")).toBeDefined();
    expect(getJargon("write-coordinator")).toBeDefined();
    expect(getJargon("wal-index")).toBeDefined();
    expect(getJargon("conformal-prediction")).toBeDefined();
    expect(getJargon("timeline-profiling")).toBeDefined();
    expect(getJargon("cahill-fekete")).toBeDefined();
  });
});
