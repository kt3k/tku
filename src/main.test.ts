import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = "src/main.ts";

Deno.test("cli - prints help message with --help", async () => {
  const { stdout } = await execFileAsync("node", [cli, "--help"]);
  assertStringIncludes(stdout, "Usage: npx @kt3k/tku [options] [path]");
  assertStringIncludes(stdout, "--encoding");
  assertStringIncludes(stdout, "--exclude");
  assertStringIncludes(stdout, "--json");
});

Deno.test("cli - counts tokens in current repo with --json", async () => {
  const { stdout } = await execFileAsync("node", [
    cli,
    "--json",
    "--top",
    "3",
  ]);
  const result = JSON.parse(stdout);
  assertEquals(result.encoding, "o200k_base");
  assertEquals(result.files.length, 3);
  assert(result.totalTokens > 0);
  assert(result.totalFiles > 0);
  for (const f of result.files) {
    assert("path" in f);
    assert(f.tokens > 0);
  }
});
