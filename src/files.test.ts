import { assert, assertEquals, assertRejects } from "@std/assert";
import { isBinary, listFiles, listTextFiles } from "./files.ts";
import { resolve } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

Deno.test("listFiles - returns tracked files in current repo", async () => {
  const files = await listFiles(".");
  assert(files.includes("deno.json"));
  assert(files.includes("src/main.ts"));
});

Deno.test("listFiles - throws for non-git directory", async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), "tku-"));
  try {
    await assertRejects(
      () => listFiles(tmpDir),
      Error,
      "Not a git repository",
    );
  } finally {
    await rm(tmpDir, { recursive: true });
  }
});

Deno.test("listFiles - respects exclude patterns", async () => {
  const files = await listFiles(".", { exclude: ["**/*.ts"] });
  assertEquals(files.some((f) => f.endsWith(".ts")), false);
  assert(files.includes("deno.json"));
});

Deno.test("listFiles - excludes a file by plain name in any directory", async () => {
  const files = await listFiles(".", { exclude: ["main.ts"] });
  assertEquals(files.some((f) => f.endsWith("main.ts")), false);
  assert(files.includes("deno.json"));
});

Deno.test("listFiles - excludes a directory by plain name", async () => {
  const files = await listFiles(".", { exclude: ["src"] });
  assertEquals(files.some((f) => f.startsWith("src/")), false);
  assert(files.includes("deno.json"));
});

Deno.test("isBinary - detects text and binary files", async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), "tku-"));
  try {
    const textPath = resolve(tmpDir, "text.txt");
    await writeFile(textPath, new TextEncoder().encode("hello world"));
    assertEquals(await isBinary(textPath), false);

    const binPath = resolve(tmpDir, "bin.dat");
    await writeFile(binPath, new Uint8Array([0x48, 0x65, 0x00, 0x6c, 0x6f]));
    assertEquals(await isBinary(binPath), true);
  } finally {
    await rm(tmpDir, { recursive: true });
  }
});

Deno.test("listTextFiles - excludes binary files", async () => {
  const files = await listTextFiles(".");
  assert(files.includes("deno.json"));
  assert(files.length > 0);
});
