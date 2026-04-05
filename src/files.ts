import { resolve } from "node:path";
import { open } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import picomatch from "picomatch";

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
    // If a pattern looks like a plain name (no glob chars or slashes),
    // also match it anywhere in the tree and as a directory prefix
    // (e.g. "foo.txt" -> "foo.txt" + "**/foo.txt",
    //  "static" -> "static" + "static/**" + "**/static" + "**/static/**").
    const expanded = options.exclude.flatMap((g) =>
      /[*?{[/]/.test(g) ? [g] : [g, `${g}/**`, `**/${g}`, `**/${g}/**`]
    );
    const isExcluded = picomatch(expanded);
    files = files.filter((f) => !isExcluded(f));
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
    onProgress?: (file: string, index: number, total: number) => void;
  } = {},
): Promise<string[]> {
  const cwd = resolve(repoPath);
  const files = await listFiles(repoPath, options);
  const results: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    options.onProgress?.(file, i + 1, files.length);
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
