import type { TokenizeResult } from "./tokenize.ts";

export interface FormatOptions {
  json?: boolean;
  top?: number;
  sort?: "tokens" | "path";
}

/** Format a token count as a compact string (e.g. "1.2 K", "345", "1.5 M"). */
export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return v % 1 === 0 ? `${v} M` : `${v.toFixed(1)} M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return v % 1 === 0 ? `${v} K` : `${v.toFixed(1)} K`;
  }
  return String(n);
}

/** Format tokenize result as a human-readable table. */
export function formatTable(result: TokenizeResult): string {
  const lines: string[] = [];
  const formatted = result.files.map((f) => ({
    path: f.path,
    display: formatTokenCount(f.tokens),
  }));
  const maxWidth = Math.max(
    "tokens".length,
    ...formatted.map((f) => f.display.length),
  );

  lines.push(`${"tokens".padStart(maxWidth)}  path`);
  for (const f of formatted) {
    lines.push(`${f.display.padStart(maxWidth)}  ${f.path}`);
  }
  lines.push(`${"─".repeat(maxWidth)}──`);
  const totalDisplay = formatTokenCount(result.totalTokens);
  lines.push(
    `${totalDisplay.padStart(maxWidth)}  total (${result.totalFiles} files)`,
  );

  return lines.join("\n");
}

/** Apply sorting and top-N filtering, then format the result. */
export function formatResult(
  result: TokenizeResult,
  options: FormatOptions = {},
): string {
  const { json = false, top, sort = "tokens" } = options;

  // Sort
  const sorted = [...result.files];
  if (sort === "path") {
    sorted.sort((a, b) => a.path.localeCompare(b.path));
  } else {
    sorted.sort((a, b) => b.tokens - a.tokens);
  }

  // Top N
  const filtered = top !== undefined ? sorted.slice(0, top) : sorted;

  const adjusted: TokenizeResult = {
    ...result,
    files: filtered,
  };

  return json ? JSON.stringify(adjusted, null, 2) : formatTable(adjusted);
}
