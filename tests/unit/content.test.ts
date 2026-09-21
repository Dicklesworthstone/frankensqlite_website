import { describe, expect, it } from "vitest";
import {
  changelog,
  codeExample,
  comparisonData,
  concurrentWritersExample,
  crates,
  ecsEncryptionExample,
  faq,
  features,
  heroStats,
  navItems,
  screenshots,
  siteConfig,
  timeTravelExample,
} from "@/lib/content";
import { getJargon, jargonDictionary } from "@/lib/franken-jargon";

describe("lib/content.ts", () => {
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
    it("has a non-empty description", () => {
      expect(siteConfig.description.length).toBeGreaterThan(0);
    });
  });

  describe("navItems", () => {
    it("has 5 navigation items", () => {
      expect(navItems).toHaveLength(5);
    });
    it("all items have href starting with /", () => {
      navItems.forEach((item) => expect(item.href).toMatch(/^\//));
    });
    it("all items have non-empty labels", () => {
      navItems.forEach((item) => expect(item.label.length).toBeGreaterThan(0));
    });
    it("includes Home route", () => {
      expect(navItems.some((n) => n.href === "/")).toBe(true);
    });
    it("includes Architecture route", () => {
      expect(navItems.some((n) => n.href === "/architecture")).toBe(true);
    });
    it("includes Spec Evolution route", () => {
      expect(navItems.some((n) => n.href === "/spec_evolution")).toBe(true);
    });
  });

  describe("heroStats", () => {
    it("has 4 stat entries", () => {
      expect(heroStats).toHaveLength(4);
    });
    it("all stats have label, value, and helper", () => {
      heroStats.forEach((stat) => {
        expect(stat.label).toBeTruthy();
        expect(stat.value).toBeTruthy();
      });
    });
    it("crate count is 26", () => {
      const crateStat = heroStats.find((s) => s.label.toLowerCase().includes("crate"));
      expect(crateStat?.value).toBe("26");
    });
    it("unsafe blocks is 0", () => {
      const unsafeStat = heroStats.find((s) => s.label.toLowerCase().includes("unsafe"));
      expect(unsafeStat?.value).toBe("0");
    });
  });

  describe("features", () => {
    it("has at least 5 features", () => {
      expect(features.length).toBeGreaterThanOrEqual(5);
    });
    it("has exactly 12 features", () => {
      expect(features).toHaveLength(12);
    });
    it("all features have title, description, and icon", () => {
      features.forEach((f) => {
        expect(f.title).toBeTruthy();
        expect(f.description).toBeTruthy();
        expect(f.icon).toBeTruthy();
      });
    });
    it("includes MVCC-related feature", () => {
      expect(features.some((f) => f.title.toLowerCase().includes("concurrent"))).toBe(true);
    });
    it("includes adaptive indexing feature", () => {
      expect(features.some((f) => f.title.toLowerCase().includes("adaptive"))).toBe(true);
    });
    it("includes structured concurrency feature", () => {
      expect(features.some((f) => f.title.toLowerCase().includes("structured"))).toBe(true);
    });
  });

  describe("crates", () => {
    it("has 26 crates", () => {
      expect(crates).toHaveLength(26);
    });
    it("all crates have name and description", () => {
      crates.forEach((c) => {
        expect(c.name).toBeTruthy();
        expect(c.description).toBeTruthy();
      });
    });
    it("all crate names start with fsqlite", () => {
      crates.forEach((c) => expect(c.name).toMatch(/^fsqlite/));
    });
    it("has no duplicate crate names", () => {
      const names = crates.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    });
    it("includes the main fsqlite crate", () => {
      expect(crates.some((c) => c.name === "fsqlite")).toBe(true);
    });
    it("includes key crates: parser, btree, mvcc, wal, vdbe", () => {
      const names = crates.map((c) => c.name);
      expect(names).toContain("fsqlite-parser");
      expect(names).toContain("fsqlite-btree");
      expect(names).toContain("fsqlite-mvcc");
      expect(names).toContain("fsqlite-wal");
      expect(names).toContain("fsqlite-vdbe");
    });
  });

  describe("comparisonData", () => {
    it("has at least 5 comparison rows", () => {
      expect(comparisonData.length).toBeGreaterThanOrEqual(5);
    });
    it("has exactly 17 comparison rows", () => {
      expect(comparisonData).toHaveLength(17);
    });
    it("all rows have feature and frankensqlite columns", () => {
      comparisonData.forEach((row) => {
        expect(row.feature).toBeTruthy();
        expect(row.frankensqlite).toBeTruthy();
      });
    });
    it("all rows have csqlite, libsql, and duckdb columns", () => {
      comparisonData.forEach((row) => {
        expect(row.csqlite).toBeTruthy();
        expect(row.libsql).toBeTruthy();
        expect(row.duckdb).toBeTruthy();
      });
    });
  });

  describe("codeExample", () => {
    it("is a non-empty string", () => {
      expect(codeExample.length).toBeGreaterThan(100);
    });
    it("contains Rust syntax markers", () => {
      expect(codeExample).toContain("fn main");
      expect(codeExample).toContain("fsqlite");
    });
    it("contains SQL statement", () => {
      expect(codeExample).toContain("CREATE TABLE");
    });
    it("shows query preparation", () => {
      expect(codeExample).toContain("prepare");
    });
  });

  describe("changelog", () => {
    it("has at least 3 phases", () => {
      expect(changelog.length).toBeGreaterThanOrEqual(3);
    });
    it("has exactly 5 phases", () => {
      expect(changelog).toHaveLength(5);
    });
    it("all entries have period, title, and items", () => {
      changelog.forEach((entry) => {
        expect(entry.period).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.items.length).toBeGreaterThan(0);
      });
    });
    it("phases are sequentially numbered", () => {
      changelog.forEach((entry, i) => {
        expect(entry.period).toBe(`Phase ${i + 1}`);
      });
    });
  });

  describe("screenshots", () => {
    it("has at least 1 screenshot", () => {
      expect(screenshots.length).toBeGreaterThanOrEqual(1);
    });
    it("all screenshots have src, alt, and title", () => {
      screenshots.forEach((s) => {
        expect(s.src).toMatch(/^\/images\//);
        expect(s.alt).toBeTruthy();
        expect(s.title).toBeTruthy();
      });
    });
    it("all screenshot srcs are webp images", () => {
      screenshots.forEach((s) => {
        expect(s.src).toMatch(/\.webp$/);
      });
    });
  });

  describe("faq", () => {
    it("has at least 3 FAQ items", () => {
      expect(faq.length).toBeGreaterThanOrEqual(3);
    });
    it("has exactly 13 FAQ items", () => {
      expect(faq).toHaveLength(13);
    });
    it("all items have question and answer", () => {
      faq.forEach((item) => {
        expect(item.question).toBeTruthy();
        expect(item.answer).toBeTruthy();
        expect(item.question.endsWith("?")).toBe(true);
      });
    });
  });

  describe("advanced code examples", () => {
    it("concurrentWritersExample contains thread::spawn", () => {
      expect(concurrentWritersExample).toContain("thread::spawn");
    });
    it("timeTravelExample contains FOR SYSTEM_TIME AS OF", () => {
      expect(timeTravelExample).toContain("SYSTEM_TIME AS OF");
    });
    it("ecsEncryptionExample contains PRAGMA fsqlite.mode", () => {
      expect(ecsEncryptionExample).toContain("PRAGMA fsqlite.mode");
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
