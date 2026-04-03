#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env
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

  try {
    const files = await listTextFiles(repoPath, {
      exclude: values.exclude,
      noGitignore: !values.gitignore,
    });

    const result = await tokenizeFiles(repoPath, files, encoding);
    const output = formatResult(result, { json: values.json, top, sort });
    console.log(output);
  } catch (e: unknown) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
