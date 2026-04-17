# QA Findings

This directory stores the output of QA analysis runs. Each run produces a JSON file with
structured findings for every scenario tested.

## File naming

```
findings-{ISO-timestamp}.json
```

Example: `findings-2026-04-15T10-05-00Z.json`

The most recent run is always the most relevant. Older files are kept for comparison.

## How findings are generated

1. Run the crawler: `pnpm --filter @voiler/web qa:crawl`
   - Navigates through the app, takes screenshots, records behaviour
   - Writes `reports/crawl-{timestamp}.json`

2. Run the analyzer: `pnpm --filter @voiler/web qa:analyze`
   - Reads the crawl report
   - Outputs a pre-populated findings template
   - An agent (or a human) reviews the template and fills in status/observations
   - The completed findings file is saved here

## Directory contents

- `schema.md` — Complete field reference for the JSON finding format
- `README.md` — This file
- `*.json` — Finding files (gitignored — only schema docs are committed)
- `.gitkeep` — Keeps this directory tracked in git even when empty

## Quick reference: finding statuses

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| OK     | Scenario passed as specified             |
| KO     | Scenario failed — bug or missing feature |
| WARN   | Passed but with UX concerns              |
| SKIP   | Not tested in this run                   |
