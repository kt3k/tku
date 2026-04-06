import { describe, expect, it } from "vitest";
import dedent from "string-dedent";
import {
  formatResult,
  formatTable,
  formatTokenCount,
  formatTree,
  summarizeByDir,
} from "./format.ts";
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

  it("formats as tree when tree option is set", () => {
    expect(formatResult(sampleResult, { tree: true })).toBe(
      formatTree(sampleResult),
    );
  });

  it("tree ignores top, json, sort options", () => {
    const treeOnly = formatResult(sampleResult, { tree: true });
    const treeWithOthers = formatResult(sampleResult, {
      tree: true,
      json: true,
      top: 1,
      sort: "path",
    });
    expect(treeWithOthers).toBe(treeOnly);
  });

  it("summarizes by directory with dirs option", () => {
    expect(formatResult(sampleResult, { dirs: true })).toBe(dedent`
      tokens  path
       2.1 K  src
      ────────
       2.4 K  total (3 files)
    `);
  });

  it("dirs with json outputs summarized JSON", () => {
    const output = formatResult(sampleResult, { dirs: true, json: true });
    const parsed = JSON.parse(output);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].path).toBe("src");
    expect(parsed.files[0].tokens).toBe(2096);
  });

  it("outputs JSON when json option is set", () => {
    const output = formatResult(sampleResult, { json: true });
    const parsed = JSON.parse(output);
    expect(parsed.encoding).toBe("o200k_base");
  });
});

describe("summarizeByDir", () => {
  it("aggregates files by all directory levels", () => {
    const input: TokenizeResult = {
      encoding: "o200k_base",
      files: [
        { path: "src/lib/util.ts", tokens: 500 },
        { path: "src/main.ts", tokens: 300 },
        { path: "README.md", tokens: 100 },
      ],
      totalTokens: 900,
      totalFiles: 3,
    };
    const result = summarizeByDir(input);
    expect(result.files).toEqual([
      { path: "src", tokens: 800 },
      { path: "src/lib", tokens: 500 },
    ]);
  });

  it("returns empty when all files are at root", () => {
    const input: TokenizeResult = {
      encoding: "o200k_base",
      files: [
        { path: "a.ts", tokens: 100 },
        { path: "b.ts", tokens: 200 },
      ],
      totalTokens: 300,
      totalFiles: 2,
    };
    const result = summarizeByDir(input);
    expect(result.files).toEqual([]);
  });
});

describe("formatTree", () => {
  it("renders a directory tree with aggregated tokens", () => {
    expect(formatTree(sampleResult)).toBe(dedent`
      tokens  path
       2.4 K  .
       2.1 K  ├── src/
       1.2 K  │   ├── index.ts
         892  │   └── utils.ts
         345  └── README.md
    `);
  });

  it("renders flat files at root level", () => {
    const result: TokenizeResult = {
      encoding: "o200k_base",
      files: [
        { path: "a.ts", tokens: 100 },
        { path: "b.ts", tokens: 200 },
      ],
      totalTokens: 300,
      totalFiles: 2,
    };
    expect(formatTree(result)).toBe(dedent`
      tokens  path
         300  .
         200  ├── b.ts
         100  └── a.ts
    `);
  });

  it("renders nested directories", () => {
    const result: TokenizeResult = {
      encoding: "o200k_base",
      files: [
        { path: "src/lib/util.ts", tokens: 500 },
        { path: "src/main.ts", tokens: 300 },
        { path: "README.md", tokens: 100 },
      ],
      totalTokens: 900,
      totalFiles: 3,
    };
    expect(formatTree(result)).toBe(dedent`
      tokens  path
         900  .
         800  ├── src/
         500  │   ├── lib/
         500  │   │   └── util.ts
         300  │   └── main.ts
         100  └── README.md
    `);
  });

  it("renders only directories with dirs option", () => {
    expect(formatTree(sampleResult, { dirs: true })).toBe(dedent`
      tokens  path
       2.4 K  .
       2.1 K  └── src/
    `);
  });

  it("renders nested directories only with dirs option", () => {
    const result: TokenizeResult = {
      encoding: "o200k_base",
      files: [
        { path: "src/lib/util.ts", tokens: 500 },
        { path: "src/main.ts", tokens: 300 },
        { path: "README.md", tokens: 100 },
      ],
      totalTokens: 900,
      totalFiles: 3,
    };
    expect(formatTree(result, { dirs: true })).toBe(dedent`
      tokens  path
         900  .
         800  └── src/
         500      └── lib/
    `);
  });

  it("renders root only when all files are at root with dirs option", () => {
    const result: TokenizeResult = {
      encoding: "o200k_base",
      files: [
        { path: "a.ts", tokens: 100 },
        { path: "b.ts", tokens: 200 },
      ],
      totalTokens: 300,
      totalFiles: 2,
    };
    expect(formatTree(result, { dirs: true })).toBe(dedent`
      tokens  path
         300  .
    `);
  });
});
