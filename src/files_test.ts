import { assertEquals, assert } from "@std/assert";
import { listFiles, listTextFiles, isBinary } from "./files.ts";
import { resolve } from "node:path";
import { writeFile, rm } from "node:fs/promises";

Deno.test("listFiles returns tracked files in current repo", async () => {
  const files = await listFiles(".");
  assert(files.includes("deno.json"));
  assert(files.includes("src/main.ts"));
});

Deno.test("listFiles throws for non-git directory", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    await listFiles(tmpDir);
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("Not a git repository"));
  } finally {
    await rm(tmpDir, { recursive: true });
  }
});

Deno.test("isBinary detects binary files", async () => {
  const tmpDir = await Deno.makeTempDir();
  try {
    // Text file
    const textPath = resolve(tmpDir, "text.txt");
    await writeFile(textPath, new TextEncoder().encode("hello world"));
    assertEquals(await isBinary(textPath), false);

    // Binary file (contains null bytes)
    const binPath = resolve(tmpDir, "bin.dat");
    await writeFile(binPath, new Uint8Array([0x48, 0x65, 0x00, 0x6c, 0x6f]));
    assertEquals(await isBinary(binPath), true);
  } finally {
    await rm(tmpDir, { recursive: true });
  }
});

Deno.test("listTextFiles", async () => {
  const files = await listTextFiles(".");
  assert(files.includes("deno.json"));
  // All returned files should be text
  assert(files.length > 0);
});

Deno.test("listFiles respects exclude patterns", async () => {
  const files = await listFiles(".", { exclude: ["**/*.ts"] });
  assert(!files.some((f) => f.endsWith(".ts")));
  assert(files.includes("deno.json"));
});
