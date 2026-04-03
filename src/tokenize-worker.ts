import { parentPort } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { get_encoding } from "tiktoken";
import type { TiktokenEncoding } from "tiktoken";

interface WorkerRequest {
  repoPath: string;
  files: string[];
  encoding: TiktokenEncoding;
}

interface WorkerResult {
  results: { path: string; tokens: number }[];
}

parentPort!.on("message", async (msg: WorkerRequest) => {
  const enc = get_encoding(msg.encoding);
  try {
    const results: { path: string; tokens: number }[] = [];
    for (const file of msg.files) {
      const fullPath = resolve(msg.repoPath, file);
      const content = await readFile(fullPath, "utf-8");
      const tokens = enc.encode_ordinary(content).length;
      results.push({ path: file, tokens });
      parentPort!.postMessage({ type: "progress", file });
    }
    parentPort!.postMessage(
      { type: "done", results } as WorkerResult & { type: string },
    );
  } finally {
    enc.free();
  }
});
