# Observability

## Logging

### Log Files

All logs are written to `logs/` at the project root. This directory is **git-ignored**.

| File | Content |
|------|---------|
| `logs/api.log` | Backend (Apollo Server) structured logs |
| `logs/combined.log` | Full Turborepo stdout/stderr, all apps |

### Logger

`apps/api/src/lib/logger.ts` — Winston-based logger configured for:
- JSON format in production
- Pretty-print in development
- Log level controlled by `LOG_LEVEL` env var (default: `info`)

### Custom Dev Runner

`scripts/dev.mjs` replaces `turbo dev` as the development entry point:
- Intercepts stdout/stderr from all child processes.
- Strips ANSI escape codes before writing to `logs/combined.log`.
- Preserves colorized output in the terminal.

Run with:
```sh
npm run dev
```

This is equivalent to `turbo run dev` but with log capture.

## Linting and Formatting

After every code change, run:

```sh
npm run lint -- --fix
```

Format all files:
```sh
npm run format
```

These are defined in the root `package.json` and delegate to ESLint + Prettier.

## RAG / Context Engine (Legacy)

`packages/context-engine` contains a LanceDB-backed RAG pipeline for AI-assisted
development. It indexes source files for semantic search.

| Command | Action |
|---------|--------|
| `npm run query` | Search the LanceDB index (ask questions about the codebase) |
| `npm run ingest` | Re-index the codebase after significant changes |

Run `npm run ingest` after:
- Major refactors
- Adding new packages or significant new files
- Changing folder structure

## context-mode MCP

context-mode is an MCP plugin that keeps large command outputs in a sandboxed
subprocess, protecting the AI context window from flooding.

See `CLAUDE.md` section 6 for the full routing hierarchy and when to use each tool.

Quick reference:

| Tool | When to use |
|------|-------------|
| `ctx_batch_execute` | Primary research: run multiple commands, auto-index, search |
| `ctx_search` | Follow-up queries on already-indexed content |
| `ctx_execute` | Run a command whose output is too large for Bash |
| `ctx_execute_file` | Analyze a file without reading it into context |
| `ctx_fetch_and_index` | Fetch a web page, index it, then query |

Diagnostics:
```sh
ctx doctor   # check installation
ctx stats    # context savings for this session
ctx upgrade  # update to latest version
```
