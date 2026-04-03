import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = "src/main.ts";

describe("cli", () => {
  it("prints help message with --help", async () => {
    const { stdout } = await execFileAsync("node", [cli, "--help"]);
    expect(stdout).toContain("Usage: npx @kt3k/tku [options] [path]");
    expect(stdout).toContain("--encoding");
    expect(stdout).toContain("--exclude");
    expect(stdout).toContain("--json");
  });

  it("counts tokens in current repo with --json", async () => {
    const { stdout } = await execFileAsync("node", [
      cli,
      "--json",
      "--top",
      "3",
    ]);
    const result = JSON.parse(stdout);
    expect(result.encoding).toBe("o200k_base");
    expect(result.files).toHaveLength(3);
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.totalFiles).toBeGreaterThan(0);
    for (const f of result.files) {
      expect(f).toHaveProperty("path");
      expect(f.tokens).toBeGreaterThan(0);
    }
  });
});
