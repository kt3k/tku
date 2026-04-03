import { resolve } from "node:path";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
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

const workerExt = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
const workerUrl = new URL(`./tokenize-worker${workerExt}`, import.meta.url);

/** Count tokens for all given files relative to repoPath, using workers. */
export async function tokenizeFiles(
  repoPath: string,
  files: string[],
  encoding: TiktokenEncoding,
  options: {
    onProgress?: (file: string, index: number, total: number) => void;
  } = {},
): Promise<TokenizeResult> {
  const resolvedRepoPath = resolve(repoPath);
  const numWorkers = Math.min(availableParallelism(), files.length || 1);

  // Split files into chunks for each worker
  const chunks: string[][] = Array.from({ length: numWorkers }, () => []);
  for (let i = 0; i < files.length; i++) {
    chunks[i % numWorkers].push(files[i]);
  }

  let progressCount = 0;
  const total = files.length;

  const workerPromises = chunks.map((chunk) => {
    if (chunk.length === 0) return Promise.resolve([]);

    return new Promise<FileTokenCount[]>((resolvePromise, reject) => {
      const worker = new Worker(workerUrl);

      worker.on("message", (msg) => {
        if (msg.type === "progress") {
          progressCount++;
          options.onProgress?.(msg.file, progressCount, total);
        } else if (msg.type === "done") {
          resolvePromise(msg.results);
          worker.terminate();
        }
      });

      worker.on("error", (err) => {
        reject(err);
        worker.terminate();
      });

      worker.postMessage({
        repoPath: resolvedRepoPath,
        files: chunk,
        encoding,
      });
    });
  });

  const chunkResults = await Promise.all(workerPromises);
  const results = chunkResults.flat();

  // Restore original file order
  const orderMap = new Map(files.map((f, i) => [f, i]));
  results.sort((a, b) => orderMap.get(a.path)! - orderMap.get(b.path)!);

  const totalTokens = results.reduce((sum, f) => sum + f.tokens, 0);

  return {
    encoding,
    files: results,
    totalTokens,
    totalFiles: results.length,
  };
}
