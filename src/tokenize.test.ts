import { assert, assertEquals } from "@std/assert";
import { countTokens, tokenizeFiles } from "./tokenize.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

Deno.test("countTokens - counts tokens for a simple string", () => {
  const count = countTokens("hello world", "o200k_base");
  assert(count > 0);
});

Deno.test("countTokens - returns 0 for empty string", () => {
  assertEquals(countTokens("", "o200k_base"), 0);
});

Deno.test("tokenizeFiles - counts tokens across multiple files", async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), "tku-"));
  try {
    await writeFile(join(tmpDir, "a.txt"), "hello world");
    await writeFile(join(tmpDir, "b.txt"), "foo bar baz");

    const result = await tokenizeFiles(
      tmpDir,
      ["a.txt", "b.txt"],
      "o200k_base",
    );

    assertEquals(result.totalFiles, 2);
    assertEquals(result.files.length, 2);
    assertEquals(
      result.totalTokens,
      result.files[0].tokens + result.files[1].tokens,
    );
    assertEquals(result.encoding, "o200k_base");
    for (const f of result.files) {
      assert(f.tokens > 0);
    }
  } finally {
    await rm(tmpDir, { recursive: true });
  }
});
