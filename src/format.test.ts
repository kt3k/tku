import { describe, expect, it } from "vitest";
import { formatResult, formatTable, formatTokenCount } from "./format.ts";
import type { TokenizeResult } from "./tokenize.ts";

const sampleResult: TokenizeResult = {
  encoding: "o200k_base",
  files: [
    { path: "src/index.ts", tokens: 1204 },
    { path: "src/utils.ts", tokens: 892 },
    { path: "README.md", tokens: 345 },
  ],
  totalTokens: 2441,
  totalFiles: 3,
};

describe("formatTokenCount", () => {
  it("formats small numbers as-is", () => {
    expect(formatTokenCount(345)).toBe("345");
    expect(formatTokenCount(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatTokenCount(1000)).toBe("1 K");
    expect(formatTokenCount(1200)).toBe("1.2 K");
    expect(formatTokenCount(2441)).toBe("2.4 K");
  });

  it("formats millions with M suffix", () => {
    expect(formatTokenCount(1000000)).toBe("1 M");
    expect(formatTokenCount(1500000)).toBe("1.5 M");
  });
});

describe("formatTable", () => {
  it("produces right-aligned table with header and total", () => {
    const output = formatTable(sampleResult);
    const lines = output.split("\n");
    expect(lines[0]).toContain("tokens");
    expect(lines[0]).toContain("path");
    expect(lines[1]).toContain("1.2 K");
    expect(lines[1]).toContain("src/index.ts");
    expect(lines[2]).toContain("892");
    expect(lines[3]).toContain("345");
    expect(lines[4]).toContain("─");
    expect(lines[5]).toContain("2.4 K");
    expect(lines[5]).toContain("total (3 files)");
  });
});

describe("formatResult", () => {
  it("sorts by tokens descending by default", () => {
    const output = formatResult(sampleResult);
    const lines = output.split("\n");
    expect(lines[1]).toContain("src/index.ts");
    expect(lines[2]).toContain("src/utils.ts");
    expect(lines[3]).toContain("README.md");
  });

  it("sorts by path when specified", () => {
    const output = formatResult(sampleResult, { sort: "path" });
    const lines = output.split("\n");
    expect(lines[1]).toContain("README.md");
    expect(lines[2]).toContain("src/index.ts");
    expect(lines[3]).toContain("src/utils.ts");
  });

  it("limits to top N files", () => {
    const output = formatResult(sampleResult, { top: 2 });
    const lines = output.split("\n");
    // header + 2 files + separator + total = 5 lines
    expect(lines).toHaveLength(5);
  });

  it("outputs JSON when json option is set", () => {
    const output = formatResult(sampleResult, { json: true });
    const parsed = JSON.parse(output);
    expect(parsed.encoding).toBe("o200k_base");
  });
});
