# Statusline Improvements Design

**Date:** 2026-04-02
**File:** `~/.claude/statusline.py`
**Status:** Approved

## Overview

Two improvements to the Claude Code statusline script:

1. **Full-state fallback cache** — when stdin has no valid data and the API is rate-limited, show the last known state in greyscale instead of blank/broken bars.
2. **Third column** — model name, effort level, and estimated quota cost per 100 requests, derived from live session deltas via EMA.

---

## Feature 1: Full-State Fallback Cache

### Problem

When the 5h quota window is exhausted, the Anthropic API returns 429 and Claude Code may not provide `rate_limits` in stdin. The existing API cache (`~/.claude/.statusline-cache.json`) only covers h5/d7 quota — the context window bar (CTX) has no fallback and drops to 0%. In worst case, all bars appear broken.

### Solution

Add a **full-state cache file** (`~/.claude/.statusline-state.json`) that saves the complete rendered state on every successful invocation. On any invocation where the current data is invalid, read from this file and render in greyscale.

### Data validity check

An invocation is considered "valid" when:

- `context_window.used_percentage > 0` in stdin, **and**
- At least one quota source is available: stdin `rate_limits` with data, or API cache with age < TTL

### State file structure

```json
{
  "ts": 1743600000.0,
  "ctx": 34.2,
  "h5": 28.1,
  "d7": 14.0,
  "h5r_unix": 1743607200,
  "d7r_unix": 1743954000,
  "breakdown": "cache:12.0% in:18.3% out:4.1%",
  "cwd": "~/Proyectos/voiler",
  "branch": "feat/plan-d-frontend",
  "used_tokens": 342000,
  "total_tokens": 1000000
}
```

### Greyscale gradient

When rendering from stale state, replace all color stops with their luminance-equivalent greyscale using:

```
Y = round(0.2126·R + 0.7152·G + 0.0722·B)
```

Color stop conversions (same breakpoint percentages, different RGB):

| Stop   | Original RGB  | Greyscale Y | Result            |
| ------ | ------------- | ----------- | ----------------- |
| Green  | (0, 190, 0)   | 136         | `(136, 136, 136)` |
| Yellow | (220, 220, 0) | 197         | `(197, 197, 197)` |
| Orange | (255, 165, 0) | 147         | `(147, 147, 147)` |
| Red    | (220, 0, 0)   | 47          | `(47, 47, 47)`    |

The `bar()` and `num_fg()` functions already accept `stops` as a parameter — define `CTX_STOPS_GREY` and `QUOTA_STOPS_GREY` with the same breakpoints, no logic changes needed.

### Stale indicator

Row 4 (full-width) appends a stale age indicator after the branch, not replacing it:

```
# Normal
📁 ~/Proyectos/voiler  //  🌱 feat/plan-d-frontend

# Stale
📁 ~/Proyectos/voiler  //  🌱 feat/plan-d-frontend  ⚠ 3m
```

The age shown is `(now - state.ts)` in minutes. Only appears when rendering from stale state.

---

## Feature 2: Third Column

Three rows aligned with the two existing columns, separated by the same padding logic.

### Layout

```
CTX  [████████░░░]  34.2%  📊 cache:12% in:18% out:4%    ◉ sonnet[1m]
5H   [██████░░░░░]  28.1%  ~2h30m @14:30                  ◈ effort: medium
WEEK [███░░░░░░░░]  14.0%  ~4d @05/04 09:00               ⟳ ~4.2%/100req
📁 ~/Proyectos/voiler  //  🌱 feat/plan-d-frontend
```

Row 4 is a single full-width line (no column split) combining cwd and branch separated by `//`.
When stale, the age indicator appends to the branch:

```
📁 ~/Proyectos/voiler  //  🌱 feat/plan-d-frontend  ⚠ 3m
```

If there is no active git branch (not a git repo), row 4 shows only cwd with no separator.

### Row 1 — Active model

Source: `~/.claude/settings.json` → `model` field (sync read, no subprocess).
Display as-is (e.g. `sonnet[1m]`, `opus`, `claude-sonnet-4-6`).
Prefix: `◉ `

### Row 2 — Effort level

Source: `~/.claude/settings.json` → `effortLevel` field.
Values: `low`, `medium`, `high`. Falls back to `—` if absent.
Prefix: `◈ effort: `

### Row 3 — Estimated quota cost

Source: computed from `.statusline-stats.json` EMA.
Format: `⟳ ~X.X%/100req`
While calibrating (< 5 valid samples): `⟳ calibrating…`

---

## Feature 3: Stats Tracking (EMA)

### File: `.statusline-stats.json`

```json
{
  "tokens_per_pct": 0.0,
  "avg_tokens_per_req": 0.0,
  "samples": 0,
  "last_total_tokens": 0,
  "last_h5_pct": 0.0,
  "last_output_tokens": 0
}
```

### New-request detection

`output_tokens` in `current_usage` only increments when the model has responded. When `output_tokens_current > last_output_tokens`, at least one new request has completed.

### Update algorithm (per valid invocation)

```python
if output_tokens > last_output_tokens:
    delta_tokens = total_tokens - last_total_tokens
    delta_pct = h5_pct - last_h5_pct

    if delta_pct > 0 and delta_tokens > 0:
        new_tpp = delta_tokens / delta_pct
        tokens_per_pct = ema(tokens_per_pct, new_tpp, alpha=0.15)
        avg_tokens_per_req = ema(avg_tokens_per_req, delta_tokens, alpha=0.15)
        samples += 1

    persist last_output_tokens, last_total_tokens, last_h5_pct
```

EMA formula: `ema(prev, new, alpha) = alpha * new + (1 - alpha) * prev`

### Display calculation

```python
pct_per_100req = (avg_tokens_per_req / tokens_per_pct) * 100
display = f"~{pct_per_100req:.1f}%/100req"
```

### Edge cases

| Case                          | Handling                            |
| ----------------------------- | ----------------------------------- |
| `delta_pct = 0`               | Skip EMA update (no new quota info) |
| `tokens_per_pct = 0`          | Show `calibrating…`                 |
| Session reset (tokens < last) | Reset `last_*` fields, preserve EMA |
| `samples < 5`                 | Show `calibrating…`                 |

---

## Files Modified / Created

| Path                               | Change                         |
| ---------------------------------- | ------------------------------ |
| `~/.claude/statusline.py`          | Modified — all logic additions |
| `~/.claude/.statusline-state.json` | Created at runtime             |
| `~/.claude/.statusline-stats.json` | Created at runtime             |
| `~/.claude/.statusline-cache.json` | Unchanged                      |
