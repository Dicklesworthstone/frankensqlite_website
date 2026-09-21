import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn, formatDate, formatDateFull, isTextInputLike, NOISE_SVG_DATA_URI } from "@/lib/utils";

describe("lib/utils.ts", () => {
  describe("cn()", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles conditional classes via clsx", () => {
      expect(cn("base", false && "hidden", "visible")).toBe("base visible");
    });

    it("deduplicates conflicting tailwind classes", () => {
      // twMerge should resolve conflicts, keeping the last one
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("handles empty input", () => {
      expect(cn()).toBe("");
    });

    it("handles undefined and null values", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("handles array input", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("handles object input from clsx", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });
  });

  describe("isTextInputLike()", () => {
    it("returns false for null", () => {
      expect(isTextInputLike(null)).toBe(false);
    });

    it("returns true for input elements", () => {
      const input = document.createElement("input");
      expect(isTextInputLike(input)).toBe(true);
    });

    it("returns true for textarea elements", () => {
      const textarea = document.createElement("textarea");
      expect(isTextInputLike(textarea)).toBe(true);
    });

    it("returns true for select elements", () => {
      const select = document.createElement("select");
      expect(isTextInputLike(select)).toBe(true);
    });

    it("returns false for div elements", () => {
      const div = document.createElement("div");
      expect(isTextInputLike(div)).toBe(false);
    });

    it("returns false for button elements", () => {
      const button = document.createElement("button");
      expect(isTextInputLike(button)).toBe(false);
    });

    it("returns true for contentEditable elements", () => {
      const parent = document.createElement("div");
      parent.setAttribute("contenteditable", "true");
      // jsdom doesn't implement isContentEditable, but the function
      // also checks el.closest("[contenteditable='true']")
      const child = document.createElement("span");
      parent.appendChild(child);
      document.body.appendChild(parent);
      expect(isTextInputLike(child)).toBe(true);
      document.body.removeChild(parent);
    });

    it("returns true for elements inside a contentEditable parent", () => {
      const parent = document.createElement("div");
      parent.setAttribute("contenteditable", "true");
      const child = document.createElement("span");
      parent.appendChild(child);
      document.body.appendChild(parent);
      expect(isTextInputLike(child)).toBe(true);
      document.body.removeChild(parent);
    });

    it("returns false for elements inside non-contentEditable parent", () => {
      const parent = document.createElement("div");
      const child = document.createElement("span");
      parent.appendChild(child);
      document.body.appendChild(parent);
      expect(isTextInputLike(child)).toBe(false);
      document.body.removeChild(parent);
    });
  });

  describe("formatDate()", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns empty string for empty input", () => {
      expect(formatDate("")).toBe("");
    });

    it("returns the original string for invalid dates", () => {
      expect(formatDate("not-a-date")).toBe("not-a-date");
    });

    it('returns "just now" for dates less than 60 seconds ago', () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const tenSecondsAgo = new Date("2026-01-15T11:59:50Z").toISOString();
      expect(formatDate(tenSecondsAgo)).toBe("just now");
    });

    it("returns minutes ago for dates less than 60 minutes ago", () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const fiveMinutesAgo = new Date("2026-01-15T11:55:00Z").toISOString();
      expect(formatDate(fiveMinutesAgo)).toBe("5m ago");
    });

    it("returns hours ago for dates less than 24 hours ago", () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const threeHoursAgo = new Date("2026-01-15T09:00:00Z").toISOString();
      expect(formatDate(threeHoursAgo)).toBe("3h ago");
    });

    it('returns "yesterday" for dates 1 day ago', () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const yesterday = new Date("2026-01-14T12:00:00Z").toISOString();
      expect(formatDate(yesterday)).toBe("yesterday");
    });

    it("returns days ago for dates 2-6 days ago", () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const threeDaysAgo = new Date("2026-01-12T12:00:00Z").toISOString();
      expect(formatDate(threeDaysAgo)).toBe("3d ago");
    });

    it("returns formatted date for dates 7+ days ago", () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const twoWeeksAgo = new Date("2026-01-01T12:00:00Z").toISOString();
      const result = formatDate(twoWeeksAgo);
      // Should be a locale-formatted date, not relative
      expect(result).toContain("2026");
      expect(result).toContain("Jan");
    });

    it("returns formatted date for future dates", () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);
      const futureDate = new Date("2026-06-01T12:00:00Z").toISOString();
      const result = formatDate(futureDate);
      expect(result).toContain("2026");
      expect(result).toContain("Jun");
    });
  });

  describe("formatDateFull()", () => {
    it("returns empty string for empty input", () => {
      expect(formatDateFull("")).toBe("");
    });

    it("returns the original string for invalid dates", () => {
      expect(formatDateFull("not-a-date")).toBe("not-a-date");
    });

    it("returns a fully formatted date string", () => {
      const result = formatDateFull("2026-01-15T12:30:00Z");
      // Should contain year, month, and time components
      expect(result).toContain("2026");
      expect(result).toContain("Jan");
    });
  });

  describe("NOISE_SVG_DATA_URI", () => {
    it("is a valid data URI", () => {
      expect(NOISE_SVG_DATA_URI).toMatch(/^data:image\/svg\+xml,/);
    });

    it("contains SVG content", () => {
      expect(NOISE_SVG_DATA_URI).toContain("svg");
    });

    it("contains feTurbulence filter", () => {
      expect(NOISE_SVG_DATA_URI).toContain("feTurbulence");
    });

    it("is a non-empty string", () => {
      expect(NOISE_SVG_DATA_URI.length).toBeGreaterThan(50);
    });
  });
});
