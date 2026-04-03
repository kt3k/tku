import { resolve } from "node:path";
import { open } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** List tracked files in a git repository, with optional filtering. */
export async function listFiles(
  repoPath: string,
  options: {
    exclude?: string[];
    noGitignore?: boolean;
  } = {},
): Promise<string[]> {
  const cwd = resolve(repoPath);

  // Build git ls-files command
  const args = ["ls-files"];
  if (options.noGitignore) {
    // List all files: tracked + untracked (excluding .git)
    args.push("--cached", "--others", "--exclude-standard");
  }

  let stdout: string;
  try {
    const result = await execFileAsync("git", args, { cwd });
    stdout = result.stdout;
  } catch (e: unknown) {
    const msg = (e as { stderr?: string }).stderr?.trim() ?? String(e);
    throw new Error(`Not a git repository or git error: ${msg}`);
  }

  let files = stdout
    .trim()
    .split("\n")
    .filter((f) => f.length > 0);

  // Apply exclude patterns
  if (options.exclude && options.exclude.length > 0) {
    const patterns = options.exclude.map((g) => new URLPattern({ pathname: g }));
    files = files.filter(
      (f) => !patterns.some((p) => p.test({ pathname: f })),
    );
  }

  return files;
}

/** Check if a file is binary by looking for null bytes in the first 8KB. */
export async function isBinary(filePath: string): Promise<boolean> {
  const handle = await open(filePath, "r");
  try {
    const buf = new Uint8Array(8192);
    const { bytesRead } = await handle.read(buf);
    if (bytesRead === null || bytesRead === 0) return false;
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } finally {
    await handle.close();
  }
}

/** List tracked text files (excluding binary files). */
export async function listTextFiles(
  repoPath: string,
  options: {
    exclude?: string[];
    noGitignore?: boolean;
  } = {},
): Promise<string[]> {
  const cwd = resolve(repoPath);
  const files = await listFiles(repoPath, options);
  const results: string[] = [];

  for (const file of files) {
    const fullPath = resolve(cwd, file);
    try {
      if (!(await isBinary(fullPath))) {
        results.push(file);
      }
    } catch {
      // Skip files that can't be read (e.g. broken symlinks)
    }
  }

  return results;
}
