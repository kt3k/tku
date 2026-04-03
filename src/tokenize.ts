import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { get_encoding } from "tiktoken";
import type { TiktokenEncoding } from "tiktoken";

export type { TiktokenEncoding };

export interface FileTokenCount {
  path: string;
  tokens: number;
}

export interface TokenizeResult {
  encoding: TiktokenEncoding;
  files: FileTokenCount[];
  totalTokens: number;
  totalFiles: number;
}

/** Count tokens for a single file. */
export function countTokens(
  content: string,
  encoding: TiktokenEncoding,
): number {
  const enc = get_encoding(encoding);
  try {
    return enc.encode_ordinary(content).length;
  } finally {
    enc.free();
  }
}

/** Count tokens for all given files relative to repoPath. */
export async function tokenizeFiles(
  repoPath: string,
  files: string[],
  encoding: TiktokenEncoding,
  options: {
    onProgress?: (file: string, index: number, total: number) => void;
  } = {},
): Promise<TokenizeResult> {
  const enc = get_encoding(encoding);
  try {
    const results: FileTokenCount[] = [];
    let totalTokens = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      options.onProgress?.(file, i + 1, files.length);
      const fullPath = resolve(repoPath, file);
      const content = await readFile(fullPath, "utf-8");
      const tokens = enc.encode_ordinary(content).length;
      results.push({ path: file, tokens });
      totalTokens += tokens;
    }

    return {
      encoding,
      files: results,
      totalTokens,
      totalFiles: results.length,
    };
  } finally {
    enc.free();
  }
}
