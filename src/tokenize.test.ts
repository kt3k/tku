import { describe, expect, it } from "vitest";
import { countTokens, tokenizeFiles } from "./tokenize.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("countTokens", () => {
  it("counts tokens for a simple string", () => {
    const count = countTokens("hello world", "o200k_base");
    expect(count).toBeGreaterThan(0);
  });

  it("returns 0 for empty string", () => {
    expect(countTokens("", "o200k_base")).toBe(0);
  });
});

describe("tokenizeFiles", () => {
  it("counts tokens across multiple files", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "tku-"));
    try {
      await writeFile(join(tmpDir, "a.txt"), "hello world");
      await writeFile(join(tmpDir, "b.txt"), "foo bar baz");

      const result = await tokenizeFiles(
        tmpDir,
        ["a.txt", "b.txt"],
        "o200k_base",
      );

      expect(result.totalFiles).toBe(2);
      expect(result.files).toHaveLength(2);
      expect(result.totalTokens).toBe(
        result.files[0].tokens + result.files[1].tokens,
      );
      expect(result.encoding).toBe("o200k_base");
      for (const f of result.files) {
        expect(f.tokens).toBeGreaterThan(0);
      }
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });
});
