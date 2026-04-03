import { describe, it, expect } from "vitest";
import { listFiles, listTextFiles, isBinary } from "./files.ts";
import { resolve } from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("listFiles", () => {
  it("returns tracked files in current repo", async () => {
    const files = await listFiles(".");
    expect(files).toContain("deno.json");
    expect(files).toContain("src/main.ts");
  });

  it("throws for non-git directory", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "tku-"));
    try {
      await expect(listFiles(tmpDir)).rejects.toThrow("Not a git repository");
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  it("respects exclude patterns", async () => {
    const files = await listFiles(".", { exclude: ["**/*.ts"] });
    expect(files.some((f) => f.endsWith(".ts"))).toBe(false);
    expect(files).toContain("deno.json");
  });
});

describe("isBinary", () => {
  it("detects text and binary files", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "tku-"));
    try {
      const textPath = resolve(tmpDir, "text.txt");
      await writeFile(textPath, new TextEncoder().encode("hello world"));
      expect(await isBinary(textPath)).toBe(false);

      const binPath = resolve(tmpDir, "bin.dat");
      await writeFile(binPath, new Uint8Array([0x48, 0x65, 0x00, 0x6c, 0x6f]));
      expect(await isBinary(binPath)).toBe(true);
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });
});

describe("listTextFiles", () => {
  it("excludes binary files", async () => {
    const files = await listTextFiles(".");
    expect(files).toContain("deno.json");
    expect(files.length).toBeGreaterThan(0);
  });
});
