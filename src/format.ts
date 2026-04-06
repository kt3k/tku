import type { TokenizeResult } from "./tokenize.ts";

export interface FormatOptions {
  json?: boolean;
  top?: number;
  sort?: "tokens" | "path";
  tree?: boolean;
  dirs?: boolean;
}

/** Format a token count as a compact string (e.g. "1.2 K", "345", "1.5 M"). */
export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)} K`;
  }
  return String(n);
}

/** Format tokenize result as a human-readable table. */
export function formatTable(
  result: TokenizeResult,
  omitted = 0,
): string {
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
  if (omitted > 0) {
    lines.push(`${"".padStart(maxWidth)}  ... ${omitted} more files`);
  }
  lines.push(`${"─".repeat(maxWidth)}──`);
  const totalDisplay = formatTokenCount(result.totalTokens);
  lines.push(
    `${totalDisplay.padStart(maxWidth)}  total (${result.totalFiles} files)`,
  );

  return lines.join("\n");
}

interface TreeNode {
  name: string;
  tokens: number;
  children: TreeNode[];
}

/** Build a directory tree from flat file list. */
function buildTree(files: { path: string; tokens: number }[]): TreeNode {
  const root: TreeNode = { name: ".", tokens: 0, children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      let child = node.children.find((c) => c.name === name);
      if (!child) {
        child = { name, tokens: 0, children: [] };
        node.children.push(child);
      }
      if (isFile) {
        child.tokens = file.tokens;
      }
      node = child;
    }
  }

  // Aggregate directory tokens bottom-up
  function aggregate(node: TreeNode): number {
    if (node.children.length === 0) return node.tokens;
    node.tokens = node.children.reduce((sum, c) => sum + aggregate(c), 0);
    return node.tokens;
  }
  aggregate(root);

  // Sort children: directories first (by tokens desc), then files (by tokens desc)
  function sortChildren(node: TreeNode): void {
    for (const child of node.children) sortChildren(child);
    const dirs = node.children
      .filter((c) => c.children.length > 0)
      .sort((a, b) => b.tokens - a.tokens);
    const leaves = node.children
      .filter((c) => c.children.length === 0)
      .sort((a, b) => b.tokens - a.tokens);
    node.children = [...dirs, ...leaves];
  }
  sortChildren(root);

  return root;
}

/** Format tokenize result as a directory tree. */
export function formatTree(
  result: TokenizeResult,
  options: { dirs?: boolean } = {},
): string {
  const tree = buildTree(result.files);
  const dirsOnly = options.dirs ?? false;
  const lines: string[] = [];

  // Determine max width from all nodes
  const allTokens: number[] = [];
  function collectTokens(node: TreeNode): void {
    if (dirsOnly && node.children.length === 0) return;
    allTokens.push(node.tokens);
    for (const child of node.children) collectTokens(child);
  }
  collectTokens(tree);
  const maxWidth = Math.max(
    "tokens".length,
    ...allTokens.map((t) => formatTokenCount(t).length),
  );

  function render(
    node: TreeNode,
    prefix: string,
    isLast: boolean,
    isRoot: boolean,
  ): void {
    const display = formatTokenCount(node.tokens);
    const connector = isRoot ? "" : isLast ? "└── " : "├── ";
    const name = node.children.length > 0 && !isRoot
      ? `${node.name}/`
      : node.name;
    lines.push(`${display.padStart(maxWidth)}  ${prefix}${connector}${name}`);

    const visibleChildren = dirsOnly
      ? node.children.filter((c) => c.children.length > 0)
      : node.children;
    const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    for (let i = 0; i < visibleChildren.length; i++) {
      render(
        visibleChildren[i],
        childPrefix,
        i === visibleChildren.length - 1,
        false,
      );
    }
  }

  lines.push(`${"tokens".padStart(maxWidth)}  path`);
  render(tree, "", true, true);

  return lines.join("\n");
}

/** Aggregate file tokens by top-level directory. Root files are excluded. */
export function summarizeByDir(
  result: TokenizeResult,
): TokenizeResult {
  const dirMap = new Map<string, number>();
  for (const file of result.files) {
    const slashIdx = file.path.indexOf("/");
    if (slashIdx === -1) continue; // skip root files
    const dir = file.path.slice(0, slashIdx);
    dirMap.set(dir, (dirMap.get(dir) ?? 0) + file.tokens);
  }
  const files = [...dirMap.entries()].map(([path, tokens]) => ({
    path,
    tokens,
  }));
  return {
    ...result,
    files,
  };
}

/** Apply sorting and top-N filtering, then format the result. */
export function formatResult(
  result: TokenizeResult,
  options: FormatOptions = {},
): string {
  const { json = false, top, sort = "tokens", tree = false, dirs = false } =
    options;

  // --tree ignores --top, --json, --sort
  if (tree) {
    return formatTree(result, { dirs });
  }

  // --dirs without --tree: summarize by directory, then apply normal formatting
  const effective = dirs ? summarizeByDir(result) : result;

  // Sort
  const sorted = [...effective.files];
  if (sort === "path") {
    sorted.sort((a, b) => a.path.localeCompare(b.path));
  } else {
    sorted.sort((a, b) => b.tokens - a.tokens);
  }

  // Top N
  const filtered = top !== undefined ? sorted.slice(0, top) : sorted;
  const omitted = sorted.length - filtered.length;

  const adjusted: TokenizeResult = {
    ...effective,
    files: filtered,
  };

  return json
    ? JSON.stringify(adjusted, null, 2)
    : formatTable(adjusted, omitted);
}
