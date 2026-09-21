import { describe, expect, it } from "vitest";
import { applySynapticPatch, stripMd } from "@/components/spec-evolution/patch-engine";

describe("components/spec-evolution/patch-engine.ts", () => {
  describe("applySynapticPatch()", () => {
    it("returns original lines when patch is empty", () => {
      const lines = ["line1", "line2", "line3"];
      const result = applySynapticPatch(lines, "");
      expect(result).toEqual(["line1", "line2", "line3"]);
    });

    it("does not mutate the original array", () => {
      const lines = ["line1", "line2", "line3"];
      const original = [...lines];
      applySynapticPatch(lines, "@@ -1,1 +1,1 @@\n-line1\n+modified");
      expect(lines).toEqual(original);
    });

    it("applies a simple single-line replacement", () => {
      const lines = ["hello", "world", "foo"];
      const patch = "@@ -1,1 +1,1 @@\n-hello\n+goodbye";
      const result = applySynapticPatch(lines, patch);
      expect(result).toEqual(["goodbye", "world", "foo"]);
    });

    it("applies a single-line addition", () => {
      const lines = ["line1", "line2"];
      // Replace 0 lines at position 2, add 1 new line
      const patch = "@@ -2,0 +2,1 @@\n+inserted";
      const result = applySynapticPatch(lines, patch);
      expect(result).toContain("inserted");
    });

    it("applies a single-line deletion", () => {
      const lines = ["line1", "line2", "line3"];
      const patch = "@@ -2,1 +2,0 @@\n-line2";
      const result = applySynapticPatch(lines, patch);
      expect(result).toEqual(["line1", "line3"]);
    });

    it("applies a multi-line replacement", () => {
      const lines = ["a", "b", "c", "d", "e"];
      const patch = "@@ -2,2 +2,3 @@\n-b\n-c\n+x\n+y\n+z";
      const result = applySynapticPatch(lines, patch);
      expect(result).toEqual(["a", "x", "y", "z", "d", "e"]);
    });

    it("preserves context lines (lines without + or -)", () => {
      const lines = ["a", "b", "c"];
      // Context line 'a', replace 'b' with 'x', context line 'c'
      const patch = "@@ -1,3 +1,3 @@\n a\n-b\n+x\n c";
      const result = applySynapticPatch(lines, patch);
      expect(result).toEqual(["a", "x", "c"]);
    });

    it("handles multiple hunks in a single patch", () => {
      const lines = ["a", "b", "c", "d", "e", "f"];
      const patch = ["@@ -1,1 +1,1 @@", "-a", "+A", "@@ -5,1 +5,1 @@", "-e", "+E"].join("\n");
      const result = applySynapticPatch(lines, patch);
      expect(result[0]).toBe("A");
      expect(result[4]).toBe("E");
    });

    it("handles patch with no matching hunk header", () => {
      const lines = ["line1", "line2"];
      const patch = "this is not a valid patch";
      const result = applySynapticPatch(lines, patch);
      expect(result).toEqual(["line1", "line2"]);
    });

    it("handles empty input lines", () => {
      const lines: string[] = [];
      const patch = "@@ -0,0 +1,2 @@\n+new1\n+new2";
      const result = applySynapticPatch(lines, patch);
      expect(result).toContain("new1");
      expect(result).toContain("new2");
    });

    it("handles hunk header without comma (defaults count to 1)", () => {
      const lines = ["only"];
      const patch = "@@ -1 +1 @@\n-only\n+replaced";
      const result = applySynapticPatch(lines, patch);
      expect(result).toEqual(["replaced"]);
    });
  });

  describe("stripMd()", () => {
    it("returns empty string for empty input", () => {
      expect(stripMd("")).toBe("");
    });

    it("strips heading markers", () => {
      expect(stripMd("# Heading")).toBe("Heading");
      expect(stripMd("## Sub Heading")).toBe("Sub Heading");
      expect(stripMd("### Third Level")).toBe("Third Level");
    });

    it("strips unordered list markers (* - +)", () => {
      expect(stripMd("* item")).toBe("item");
      expect(stripMd("- item")).toBe("item");
      expect(stripMd("+ item")).toBe("item");
    });

    it("strips ordered list markers", () => {
      expect(stripMd("1. first")).toBe("first");
      expect(stripMd("42. forty-two")).toBe("forty-two");
    });

    it("strips blockquote markers", () => {
      expect(stripMd("> quoted text")).toBe("quoted text");
    });

    it("strips inline formatting characters (* _ ~ `)", () => {
      expect(stripMd("**bold**")).toBe("bold");
      expect(stripMd("*italic*")).toBe("italic");
      expect(stripMd("__underline__")).toBe("underline");
      expect(stripMd("~~strikethrough~~")).toBe("strikethrough");
      expect(stripMd("`code`")).toBe("code");
    });

    it("strips combined heading and inline formatting", () => {
      expect(stripMd("## **Bold Heading**")).toBe("Bold Heading");
    });

    it("trims whitespace", () => {
      expect(stripMd("  some text  ")).toBe("some text");
    });

    it("handles plain text unchanged", () => {
      expect(stripMd("plain text")).toBe("plain text");
    });

    it("strips only leading list marker, not mid-line stars", () => {
      // The regex strips leading list marker and inline formatting chars
      expect(stripMd("* bold and *italic*")).toBe("bold and italic");
    });
  });
});
