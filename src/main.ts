#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "node:util";
import { listTextFiles } from "./files.ts";
import { tokenizeFiles } from "./tokenize.ts";
import type { TiktokenEncoding } from "./tokenize.ts";
import { formatResult } from "./format.ts";

function printUsage() {
  console.log(`Usage: tku [options] [path]

Options:
      --encoding <encoding>   Tiktoken encoding (default: o200k_base)
  -e, --exclude <glob...>     Glob patterns to exclude (repeatable)
      --no-gitignore          Do not respect .gitignore rules
      --json                  Output results as JSON
      --top <n>               Show only the top N files by token count
      --sort <field>          Sort by "tokens" or "path" (default: tokens)
  -h, --help                  Show this help message`);
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      encoding: { type: "string", default: "o200k_base" },
      exclude: { type: "string", short: "e", multiple: true },
      gitignore: { type: "boolean", default: true },
      json: { type: "boolean", default: false },
      top: { type: "string" },
      sort: { type: "string", default: "tokens" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const repoPath = positionals[0] ?? ".";
  const encoding = values.encoding as TiktokenEncoding;
  const sort = values.sort as "tokens" | "path";
  const top = values.top !== undefined ? Number(values.top) : undefined;

  const isTTY = process.stderr.isTTY;
  function status(msg: string) {
    if (isTTY) {
      const cols = process.stderr.columns || 80;
      const truncated = msg.length > cols ? msg.slice(0, cols) : msg;
      process.stderr.write(`\r\x1b[K${truncated}`);
    }
  }
  function clearStatus() {
    if (isTTY) {
      process.stderr.write("\r\x1b[K");
    }
  }

  try {
    const files = await listTextFiles(repoPath, {
      exclude: values.exclude,
      noGitignore: !values.gitignore,
      onProgress: (file, i, total) =>
        status(`Scanning [${i}/${total}] ${file}`),
    });
    clearStatus();

    const result = await tokenizeFiles(repoPath, files, encoding, {
      onProgress: (file, i, total) =>
        status(`Tokenizing [${i}/${total}] ${file}`),
    });
    clearStatus();

    const output = formatResult(result, { json: values.json, top, sort });
    console.log(output);
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
