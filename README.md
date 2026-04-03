# @kt3k/tku — Git Repository Token Counter

## Overview

`@kt3k/tku` is a CLI tool that counts the total number of tokens in a git repository.
It uses [tiktoken](https://www.npmjs.com/package/tiktoken) to tokenize file
contents and reports the token count per file and in total.

## Motivation

When working with LLMs, knowing the token size of a codebase helps estimate
context window usage, cost, and whether a repository (or subset) fits within
model limits. `tku` provides a quick, accurate measurement directly from the
command line.

## Usage

```sh
npx @kt3k/tku [options] [path]
```

- `path` — Path to a git repository (defaults to current directory).

### Options

| Flag                      | Description                                           | Default              |
| ------------------------- | ----------------------------------------------------- | -------------------- |
| `-m, --model <model>`     | Tiktoken encoding model (e.g. `gpt-4o`, `o200k_base`) | `o200k_base`         |
| `-e, --exclude <glob...>` | Additional glob patterns to exclude                   | none                 |
| `--no-gitignore`          | Do not respect `.gitignore` rules                     | respect `.gitignore` |
| `--json`                  | Output results as JSON                                | false                |
| `--top <n>`               | Show only the top N files by token count              | show all             |
| `--sort <field>`          | Sort by `tokens` or `path`                            | `tokens`             |

### Examples

```sh
# Count tokens in the current repo
npx @kt3k/tku

# Count tokens using gpt-4o encoding, show top 20 files
npx @kt3k/tku --model gpt-4o --top 20

# JSON output for scripting
npx @kt3k/tku --json

# Exclude test files
npx @kt3k/tku --exclude "**/*.test.*" --exclude "**/fixtures/**"
```

## Output

### Default (human-readable)

```
tokens  path
 1.2 K  src/index.ts
   892  src/utils.ts
   345  README.md
──────
 2.4 K  total (3 files)
```

### JSON (`--json`)

```json
{
  "encoding": "o200k_base",
  "files": [
    { "path": "src/index.ts", "tokens": 1204 },
    { "path": "src/utils.ts", "tokens": 892 },
    { "path": "README.md", "tokens": 345 }
  ],
  "totalTokens": 2441,
  "totalFiles": 3
}
```

## License

MIT
