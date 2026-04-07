import { assertEquals } from "jsr:@std/assert";
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

Deno.test("formatTokenCount - formats small numbers as-is", () => {
  assertEquals(formatTokenCount(345), "345");
  assertEquals(formatTokenCount(999), "999");
});

Deno.test("formatTokenCount - formats thousands with K suffix", () => {
  assertEquals(formatTokenCount(1000), "1.0 K");
  assertEquals(formatTokenCount(1200), "1.2 K");
  assertEquals(formatTokenCount(2441), "2.4 K");
});

Deno.test("formatTokenCount - formats millions with M suffix", () => {
  assertEquals(formatTokenCount(1000000), "1.0 M");
  assertEquals(formatTokenCount(1500000), "1.5 M");
});

Deno.test("formatTable - produces right-aligned table with header and total", () => {
  assertEquals(
    formatTable(sampleResult),
    dedent`
      tokens  path
       1.2 K  src/index.ts
         892  src/utils.ts
         345  README.md
      ────────
       2.4 K  total (3 files)
    `,
  );
});

Deno.test("formatResult - sorts by tokens descending by default", () => {
  assertEquals(
    formatResult(sampleResult),
    dedent`
      tokens  path
       1.2 K  src/index.ts
         892  src/utils.ts
         345  README.md
      ────────
       2.4 K  total (3 files)
    `,
  );
});

Deno.test("formatResult - sorts by path when specified", () => {
  assertEquals(
    formatResult(sampleResult, { sort: "path" }),
    dedent`
      tokens  path
         345  README.md
       1.2 K  src/index.ts
         892  src/utils.ts
      ────────
       2.4 K  total (3 files)
    `,
  );
});

Deno.test("formatResult - limits to top N files and shows omitted count", () => {
  assertEquals(
    formatResult(sampleResult, { top: 2 }),
    dedent`
      tokens  path
       1.2 K  src/index.ts
         892  src/utils.ts
              ... 1 more files
      ────────
       2.4 K  total (3 files)
    `,
  );
});

Deno.test("formatResult - formats as tree when tree option is set", () => {
  assertEquals(formatResult(sampleResult, { tree: true }), formatTree(sampleResult));
});

Deno.test("formatResult - tree ignores top, json, sort options", () => {
  const treeOnly = formatResult(sampleResult, { tree: true });
  const treeWithOthers = formatResult(sampleResult, {
    tree: true,
    json: true,
    top: 1,
    sort: "path",
  });
  assertEquals(treeWithOthers, treeOnly);
});

Deno.test("formatResult - summarizes by directory with dirs option", () => {
  assertEquals(
    formatResult(sampleResult, { dirs: true }),
    dedent`
      tokens  path
       2.1 K  src
      ────────
       2.4 K  total (3 files)
    `,
  );
});

Deno.test("formatResult - dirs with json outputs summarized JSON", () => {
  const output = formatResult(sampleResult, { dirs: true, json: true });
  const parsed = JSON.parse(output);
  assertEquals(parsed.files.length, 1);
  assertEquals(parsed.files[0].path, "src");
  assertEquals(parsed.files[0].tokens, 2096);
});

Deno.test("formatResult - outputs JSON when json option is set", () => {
  const output = formatResult(sampleResult, { json: true });
  const parsed = JSON.parse(output);
  assertEquals(parsed.encoding, "o200k_base");
});

Deno.test("summarizeByDir - aggregates files by all directory levels", () => {
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
  assertEquals(result.files, [
    { path: "src", tokens: 800 },
    { path: "src/lib", tokens: 500 },
  ]);
});

Deno.test("summarizeByDir - returns empty when all files are at root", () => {
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
  assertEquals(result.files, []);
});

Deno.test("formatTree - renders a directory tree with aggregated tokens", () => {
  assertEquals(
    formatTree(sampleResult),
    dedent`
      tokens  path
       2.4 K  .
       2.1 K  ├── src/
       1.2 K  │   ├── index.ts
         892  │   └── utils.ts
         345  └── README.md
    `,
  );
});

Deno.test("formatTree - renders flat files at root level", () => {
  const result: TokenizeResult = {
    encoding: "o200k_base",
    files: [
      { path: "a.ts", tokens: 100 },
      { path: "b.ts", tokens: 200 },
    ],
    totalTokens: 300,
    totalFiles: 2,
  };
  assertEquals(
    formatTree(result),
    dedent`
      tokens  path
         300  .
         200  ├── b.ts
         100  └── a.ts
    `,
  );
});

Deno.test("formatTree - renders nested directories", () => {
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
  assertEquals(
    formatTree(result),
    dedent`
      tokens  path
         900  .
         800  ├── src/
         500  │   ├── lib/
         500  │   │   └── util.ts
         300  │   └── main.ts
         100  └── README.md
    `,
  );
});

Deno.test("formatTree - renders only directories with dirs option", () => {
  assertEquals(
    formatTree(sampleResult, { dirs: true }),
    dedent`
      tokens  path
       2.4 K  .
       2.1 K  └── src/
    `,
  );
});

Deno.test("formatTree - renders nested directories only with dirs option", () => {
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
  assertEquals(
    formatTree(result, { dirs: true }),
    dedent`
      tokens  path
         900  .
         800  └── src/
         500      └── lib/
    `,
  );
});

Deno.test("formatTree - renders root only when all files are at root with dirs option", () => {
  const result: TokenizeResult = {
    encoding: "o200k_base",
    files: [
      { path: "a.ts", tokens: 100 },
      { path: "b.ts", tokens: 200 },
    ],
    totalTokens: 300,
    totalFiles: 2,
  };
  assertEquals(
    formatTree(result, { dirs: true }),
    dedent`
      tokens  path
         300  .
    `,
  );
});
