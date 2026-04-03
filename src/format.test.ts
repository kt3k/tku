import { describe, expect, it } from "vitest";
import dedent from "string-dedent";
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
    expect(formatTokenCount(1000)).toBe("1.0 K");
    expect(formatTokenCount(1200)).toBe("1.2 K");
    expect(formatTokenCount(2441)).toBe("2.4 K");
  });

  it("formats millions with M suffix", () => {
    expect(formatTokenCount(1000000)).toBe("1.0 M");
    expect(formatTokenCount(1500000)).toBe("1.5 M");
  });
});

describe("formatTable", () => {
  it("produces right-aligned table with header and total", () => {
    expect(formatTable(sampleResult)).toBe(dedent`
      tokens  path
       1.2 K  src/index.ts
         892  src/utils.ts
         345  README.md
      ────────
       2.4 K  total (3 files)
    `);
  });
});

describe("formatResult", () => {
  it("sorts by tokens descending by default", () => {
    expect(formatResult(sampleResult)).toBe(dedent`
      tokens  path
       1.2 K  src/index.ts
         892  src/utils.ts
         345  README.md
      ────────
       2.4 K  total (3 files)
    `);
  });

  it("sorts by path when specified", () => {
    expect(formatResult(sampleResult, { sort: "path" })).toBe(dedent`
      tokens  path
         345  README.md
       1.2 K  src/index.ts
         892  src/utils.ts
      ────────
       2.4 K  total (3 files)
    `);
  });

  it("limits to top N files and shows omitted count", () => {
    expect(formatResult(sampleResult, { top: 2 })).toBe(dedent`
      tokens  path
       1.2 K  src/index.ts
         892  src/utils.ts
              ... 1 more files
      ────────
       2.4 K  total (3 files)
    `);
  });

  it("outputs JSON when json option is set", () => {
    const output = formatResult(sampleResult, { json: true });
    const parsed = JSON.parse(output);
    expect(parsed.encoding).toBe("o200k_base");
  });
});
