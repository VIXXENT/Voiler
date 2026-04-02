# Statusline Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `~/.claude/statusline.py` with a full-state fallback cache (greyscale bars when stale), a stats-tracking EMA to estimate quota cost per 100 requests, and a third column showing active model, effort, and cost estimate.

**Architecture:** Single Python file with no new dependencies. Three new JSON data files created at runtime. Main changes: (1) pure helper functions for greyscale conversion, state persistence, stats EMA, and settings reading; (2) refactored `main()` that validates stdin data, falls back to persisted state when invalid, and renders a 4-row layout with 3 columns.

**Tech Stack:** Python 3 stdlib only (`json`, `os`, `time`, `fcntl`, `subprocess`, `urllib.request`)

---

## File Map

| File                               | Change             | Responsibility                       |
| ---------------------------------- | ------------------ | ------------------------------------ |
| `~/.claude/statusline.py`          | Modify             | All logic — single source of truth   |
| `~/.claude/.statusline-state.json` | Created at runtime | Last valid full render state         |
| `~/.claude/.statusline-stats.json` | Created at runtime | EMA stats for cost estimation        |
| `~/.claude/.statusline-cache.json` | Unchanged          | API-fetched quota (h5/d7) — existing |

---

## Task 1: Greyscale color stops

**Files:**

- Modify: `~/.claude/statusline.py` — add after existing color constants (after line 30)

- [ ] **Step 1: Add `to_grey` and grey stop constants**

Insert after the `QUOTA_STOPS` definition (after line 30 in the current file):

```python
def to_grey(r, g, b):
    y = round(0.2126 * r + 0.7152 * g + 0.0722 * b)
    return (y, y, y)


CTX_STOPS_GREY = [(p, to_grey(*c)) for p, c in CTX_STOPS]
QUOTA_STOPS_GREY = [(p, to_grey(*c)) for p, c in QUOTA_STOPS]
```

- [ ] **Step 2: Verify greyscale values manually**

Run in terminal:

```bash
python3 -c "
from statusline import to_grey, CTX_STOPS_GREY, QUOTA_STOPS_GREY
print('grey stops CTX:', CTX_STOPS_GREY)
print('grey stops QUOTA:', QUOTA_STOPS_GREY)
" 2>/dev/null || python3 -c "
def to_grey(r, g, b):
    y = round(0.2126 * r + 0.7152 * g + 0.0722 * b)
    return (y, y, y)
print('green:', to_grey(0, 190, 0))    # expect (136,136,136)
print('yellow:', to_grey(220, 220, 0)) # expect (197,197,197)
print('orange:', to_grey(255, 165, 0)) # expect (147,147,147)
print('red:', to_grey(220, 0, 0))      # expect (47,47,47)
"
```

Expected output:

```
green: (136, 136, 136)
yellow: (197, 197, 197)
orange: (147, 147, 147)
red: (47, 47, 47)
```

- [ ] **Step 3: Smoke-test bars still render**

```bash
echo '{"context_window":{"used_percentage":50},"rate_limits":{"five_hour":{"used_percentage":30,"resets_at":0},"seven_day":{"used_percentage":10,"resets_at":0}}}' \
  | python3 ~/.claude/statusline.py
```

Expected: 3 rows of bars with no Python traceback.

- [ ] **Step 4: Commit**

```bash
git -C ~/.claude add statusline.py 2>/dev/null || true
cd ~ && git add .claude/statusline.py 2>/dev/null || true
# If statusline.py is not tracked by git, just save — no commit needed for this file.
# Skip git steps if ~/.claude is not a git repo.
```

---

## Task 2: State file helpers

**Files:**

- Modify: `~/.claude/statusline.py` — add after `read_cache` / `do_fetch` / `trigger_fetch` block (after line ~126)

- [ ] **Step 1: Add `STATE_FILE` constant and three helper functions**

Add the constant alongside the other `_FILE` constants at the top of the file (after `CREDS_FILE` line):

```python
STATE_FILE = os.path.expanduser("~/.claude/.statusline-state.json")
```

Then add the three functions after the `trigger_fetch` function:

```python
def is_valid_data(stdin_data, has_quota_source):
    """Return True when current stdin provides usable CTX and quota data."""
    ctx_pct = float(
        stdin_data.get("context_window", {}).get("used_percentage", 0) or 0
    )
    return ctx_pct > 0 and has_quota_source


def save_state(
    ctx, h5, d7, h5r, d7r,
    breakdown, cwd, branch,
    used_tokens, total_tokens,
):
    """Persist the current valid render state for fallback use."""
    state = {
        "ts": time.time(),
        "ctx": ctx,
        "h5": h5,
        "d7": d7,
        "h5r": h5r,
        "d7r": d7r,
        "breakdown": breakdown,
        "cwd": cwd,
        "branch": branch,
        "used_tokens": used_tokens,
        "total_tokens": total_tokens,
    }
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f)
    except Exception:
        pass


def load_state():
    """Return last persisted state dict, or None if unavailable."""
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return None
```

- [ ] **Step 2: Verify helpers work in isolation**

```bash
python3 - <<'EOF'
import json, os, time

STATE_FILE = os.path.expanduser("~/.claude/.statusline-state-TEST.json")

def save_state(ctx, h5, d7, h5r, d7r, breakdown, cwd, branch, used_tokens, total_tokens):
    state = {"ts": time.time(), "ctx": ctx, "h5": h5, "d7": d7,
             "h5r": h5r, "d7r": d7r, "breakdown": breakdown,
             "cwd": cwd, "branch": branch,
             "used_tokens": used_tokens, "total_tokens": total_tokens}
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def load_state():
    with open(STATE_FILE) as f:
        return json.load(f)

save_state(34.2, 28.1, 14.0, 0, 0, "cache:10%", "~/test", "main", 100000, 1000000)
s = load_state()
assert s["ctx"] == 34.2, f"expected 34.2 got {s['ctx']}"
assert s["branch"] == "main"
print("OK — state round-trip works")
os.remove(STATE_FILE)
EOF
```

Expected: `OK — state round-trip works`

- [ ] **Step 3: Commit checkpoint** (skip if `~/.claude` is not a git repo)

---

## Task 3: Stats tracking (EMA)

**Files:**

- Modify: `~/.claude/statusline.py` — add after state file helpers

- [ ] **Step 1: Add `STATS_FILE` constant**

Add alongside other `_FILE` constants at the top:

```python
STATS_FILE = os.path.expanduser("~/.claude/.statusline-stats.json")
EMA_ALPHA = 0.15
MIN_SAMPLES = 5
```

- [ ] **Step 2: Add stats functions**

Add after `load_state()`:

```python
def ema(prev, new, alpha=EMA_ALPHA):
    """Exponential moving average. Returns `new` directly when prev is 0."""
    if prev == 0:
        return float(new)
    return alpha * float(new) + (1.0 - alpha) * prev


def load_stats():
    """Return stats dict from file, or fresh zeroed dict."""
    try:
        with open(STATS_FILE) as f:
            return json.load(f)
    except Exception:
        return {
            "tokens_per_pct": 0.0,
            "avg_tokens_per_req": 0.0,
            "samples": 0,
            "last_total_tokens": 0,
            "last_h5_pct": 0.0,
            "last_output_tokens": 0,
        }


def update_stats(stats, total_tokens, h5_pct, output_tokens):
    """
    Update EMA stats if a new request has completed.
    Returns updated stats dict (mutated in-place).
    """
    last_out = stats.get("last_output_tokens", 0)
    last_tokens = stats.get("last_total_tokens", 0)
    last_h5 = stats.get("last_h5_pct", 0.0)

    # Detect session reset
    if total_tokens < last_tokens:
        stats["last_total_tokens"] = total_tokens
        stats["last_h5_pct"] = h5_pct
        stats["last_output_tokens"] = output_tokens
        return stats

    if output_tokens > last_out:
        delta_tokens = total_tokens - last_tokens
        delta_pct = h5_pct - last_h5
        if delta_pct > 0 and delta_tokens > 0:
            new_tpp = delta_tokens / delta_pct
            stats["tokens_per_pct"] = ema(stats.get("tokens_per_pct", 0.0), new_tpp)
            stats["avg_tokens_per_req"] = ema(
                stats.get("avg_tokens_per_req", 0.0), delta_tokens
            )
            stats["samples"] = stats.get("samples", 0) + 1
        stats["last_total_tokens"] = total_tokens
        stats["last_h5_pct"] = h5_pct
        stats["last_output_tokens"] = output_tokens

    return stats


def save_stats(stats):
    """Persist stats dict."""
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(stats, f)
    except Exception:
        pass


def get_cost_estimate(stats):
    """Return display string for estimated % cost per 100 requests."""
    tpp = stats.get("tokens_per_pct", 0.0)
    atr = stats.get("avg_tokens_per_req", 0.0)
    samples = stats.get("samples", 0)
    if samples < MIN_SAMPLES or tpp == 0 or atr == 0:
        return "calibrating\u2026"
    pct_per_100req = (atr / tpp) * 100.0
    return f"~{pct_per_100req:.1f}%/100req"
```

- [ ] **Step 3: Test EMA logic**

```bash
python3 - <<'EOF'
EMA_ALPHA = 0.15
MIN_SAMPLES = 5

def ema(prev, new, alpha=EMA_ALPHA):
    if prev == 0:
        return float(new)
    return alpha * float(new) + (1.0 - alpha) * prev

def get_cost_estimate(stats):
    tpp = stats.get("tokens_per_pct", 0.0)
    atr = stats.get("avg_tokens_per_req", 0.0)
    samples = stats.get("samples", 0)
    if samples < MIN_SAMPLES or tpp == 0 or atr == 0:
        return "calibrating\u2026"
    pct_per_100req = (atr / tpp) * 100.0
    return f"~{pct_per_100req:.1f}%/100req"

# Test ema seed
assert ema(0, 100) == 100.0, "seed failed"
# Test ema convergence direction
v = 0.0
for _ in range(20):
    v = ema(v, 1000)
assert 900 < v < 1000, f"ema not converging: {v}"
# Test calibrating state
assert get_cost_estimate({"samples": 3, "tokens_per_pct": 100000, "avg_tokens_per_req": 50000}) == "calibrating\u2026"
# Test with enough samples: 50000 tokens / 100000 tok_per_pct * 100 = 50%/100req
result = get_cost_estimate({"samples": 10, "tokens_per_pct": 100000.0, "avg_tokens_per_req": 50000.0})
assert result == "~50.0%/100req", f"unexpected: {result}"
print("OK — EMA and cost estimate tests pass")
EOF
```

Expected: `OK — EMA and cost estimate tests pass`

---

## Task 4: Model and effort reader

**Files:**

- Modify: `~/.claude/statusline.py` — add after stats functions

- [ ] **Step 1: Add `SETTINGS_FILE` constant**

Add alongside other `_FILE` constants at the top:

```python
SETTINGS_FILE = os.path.expanduser("~/.claude/settings.json")
```

- [ ] **Step 2: Add `get_model_effort` function**

Add after `get_cost_estimate()`:

```python
def get_model_effort():
    """Read active model and effort level from ~/.claude/settings.json."""
    try:
        with open(SETTINGS_FILE) as f:
            s = json.load(f)
        model = s.get("model") or "\u2014"
        effort = s.get("effortLevel") or "\u2014"
        return model, effort
    except Exception:
        return "\u2014", "\u2014"
```

- [ ] **Step 3: Test with current settings**

```bash
python3 - <<'EOF'
import json, os

SETTINGS_FILE = os.path.expanduser("~/.claude/settings.json")

def get_model_effort():
    try:
        with open(SETTINGS_FILE) as f:
            s = json.load(f)
        model = s.get("model") or "\u2014"
        effort = s.get("effortLevel") or "\u2014"
        return model, effort
    except Exception:
        return "\u2014", "\u2014"

model, effort = get_model_effort()
print(f"model='{model}' effort='{effort}'")
assert model != "", "model must not be empty string"
assert effort != "", "effort must not be empty string"
print("OK")
EOF
```

Expected: prints current model (e.g. `model='sonnet[1m]' effort='medium'`) and `OK`.

---

## Task 5: Refactor `main()` — new 4-row 3-column layout

This is the largest change. It replaces the entire `main()` function with a version that:

1. Validates stdin data and falls back to stale state when invalid
2. Uses greyscale color stops when rendering stale data
3. Moves reset-time info from the left bar label to the middle column
4. Adds a right column (model / effort / cost estimate)
5. Renders row 4 as a single full-width line with cwd and branch

**Files:**

- Modify: `~/.claude/statusline.py` — replace `main()` entirely

- [ ] **Step 1: Replace `main()` with the new implementation**

Remove the old `main()` function (lines ~285–365) and replace with:

```python
def main():
    if "--fetch" in sys.argv:
        try:
            fd = os.open(LOCK_FILE, os.O_CREAT | os.O_WRONLY)
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            do_fetch()
            fcntl.flock(fd, fcntl.LOCK_UN)
            os.close(fd)
        except Exception:
            pass
        return

    # --- 1. Read stdin ---
    try:
        stdin_data = json.load(sys.stdin)
    except Exception:
        stdin_data = {}

    # --- 2. Rate limits: stdin → API cache ---
    rl = stdin_data.get("rate_limits", {})
    if rl:
        h5 = float(rl.get("five_hour", {}).get("used_percentage", 0) or 0)
        d7 = float(rl.get("seven_day", {}).get("used_percentage", 0) or 0)
        h5r = rl.get("five_hour", {}).get("resets_at", 0)
        d7r = rl.get("seven_day", {}).get("resets_at", 0)
        cd5 = fmt_countdown_unix(h5r)
        cd7 = fmt_countdown_unix(d7r)
        at5 = fmt_abs_time_unix(h5r)
        at7 = fmt_abs_datetime_unix(d7r)
        has_quota = True
    else:
        cache, age = read_cache()
        if age > CACHE_TTL:
            trigger_fetch()
        h5 = float(cache.get("h5", 0) or 0)
        d7 = float(cache.get("d7", 0) or 0)
        cd5 = fmt_countdown_iso(cache.get("h5r", ""))
        cd7 = fmt_countdown_iso(cache.get("d7r", ""))
        at5 = fmt_abs_time_iso(cache.get("h5r", ""))
        at7 = fmt_abs_datetime_iso(cache.get("d7r", ""))
        has_quota = age < CACHE_TTL * 10  # stale but present

    # --- 3. Validate and resolve render data ---
    valid = is_valid_data(stdin_data, has_quota or rl)
    stale = False
    stale_age_min = 0

    if valid:
        ctx = float(
            stdin_data.get("context_window", {}).get("used_percentage", 0) or 0
        )
        breakdown = get_breakdown(stdin_data)
        cwd = get_cwd(stdin_data)
        branch = get_git_branch()
        used_tk, total_tk = get_ctx_tokens(stdin_data)
        ctx_stops = CTX_STOPS
        quota_stops = QUOTA_STOPS
    else:
        state = load_state()
        if state is None:
            # No stale data either — render zeroed bars in grey
            state = {
                "ctx": 0, "h5": 0, "d7": 0,
                "h5r": 0, "d7r": 0,
                "breakdown": "", "cwd": "?", "branch": "",
                "used_tokens": 0, "total_tokens": 0,
                "ts": time.time(),
            }
        stale = True
        stale_age_min = max(0, int((time.time() - state.get("ts", time.time())) / 60))
        ctx = float(state.get("ctx", 0))
        h5 = float(state.get("h5", 0))
        d7 = float(state.get("d7", 0))
        h5r = state.get("h5r", 0)
        d7r = state.get("d7r", 0)
        cd5 = fmt_countdown_unix(h5r) if isinstance(h5r, (int, float)) else fmt_countdown_iso(h5r)
        cd7 = fmt_countdown_unix(d7r) if isinstance(d7r, (int, float)) else fmt_countdown_iso(d7r)
        at5 = fmt_abs_time_unix(h5r) if isinstance(h5r, (int, float)) else fmt_abs_time_iso(h5r)
        at7 = fmt_abs_datetime_unix(d7r) if isinstance(d7r, (int, float)) else fmt_abs_datetime_iso(d7r)
        breakdown = state.get("breakdown", "")
        cwd = state.get("cwd", "?")
        branch = state.get("branch", "")
        used_tk = state.get("used_tokens", 0)
        total_tk = state.get("total_tokens", 0)
        ctx_stops = CTX_STOPS_GREY
        quota_stops = QUOTA_STOPS_GREY

    # --- 4. Stats update (only on valid data) ---
    stats = load_stats()
    if valid:
        cu = stdin_data.get("context_window", {}).get("current_usage", {})
        output_tokens = cu.get("output_tokens", 0) or 0
        stats = update_stats(stats, used_tk, h5, output_tokens)
        save_stats(stats)

    # --- 5. Model / effort / cost ---
    model, effort = get_model_effort()
    cost_est = get_cost_estimate(stats)

    # --- 6. Build reset-time strings for middle column ---
    info5 = build_reset_info(cd5, at5).strip()
    info7 = build_reset_info(cd7, at7).strip()

    # --- 7. Token string for CTX ---
    tk_str = f" {fmt_tk(used_tk)}/{fmt_tk(total_tk)}" if total_tk else ""

    # --- 8. Left column (bars) ---
    nc = num_fg(ctx, ctx_stops)
    n5 = num_fg(h5, quota_stops)
    n7 = num_fg(d7, quota_stops)

    left_ctx = (
        f"CTX  [{bar(ctx, ctx_stops)}]"
        f" {nc}{ctx:5.1f}%{RESET}{tk_str}"
    )
    left_5h = f"5H   [{bar(h5, quota_stops)}] {n5}{h5:5.1f}%{RESET}"
    left_wk = f"WEEK [{bar(d7, quota_stops)}] {n7}{d7:5.1f}%{RESET}"

    # --- 9. Middle column ---
    mid_ctx = f"\U0001f4ca {breakdown}" if breakdown else ""
    mid_5h = info5
    mid_wk = info7

    # --- 10. Right column ---
    right_ctx = f"\u25ce {model}"
    right_5h = f"\u25c8 effort: {effort}"
    right_wk = f"\u27f3 {cost_est}"

    # --- 11. Alignment: 3-column rows ---
    max_l = max(visible_len(left_ctx), visible_len(left_5h), visible_len(left_wk))
    max_m = max(visible_len(mid_ctx), visible_len(mid_5h), visible_len(mid_wk))
    PAD = 2

    def row3(left, mid, right):
        pad_l = max_l - visible_len(left) + PAD
        pad_m = max_m - visible_len(mid) + PAD
        return (
            f"{left}{' ' * pad_l}"
            f"{DIM}{mid}{RESET}{' ' * pad_m}"
            f"{DIM}{right}{RESET}"
        )

    # --- 12. Row 4: full-width cwd // branch ---
    branch_str = f"\ue0a0 {branch}" if branch else ""
    stale_tag = f"  \u26a0 {stale_age_min}m" if stale else ""

    if branch_str:
        row4 = f"\U0001f4c1 {cwd}  //  {branch_str}{stale_tag}"
    else:
        row4 = f"\U0001f4c1 {cwd}{stale_tag}"

    # --- 13. Persist valid state ---
    if valid:
        save_state(
            ctx, h5, d7, h5r, d7r,
            breakdown, cwd, branch,
            used_tk, total_tk,
        )

    # --- 14. Print ---
    print(row3(left_ctx, mid_ctx, right_ctx))
    print(row3(left_5h, mid_5h, right_5h))
    print(row3(left_wk, mid_wk, right_wk))
    print(row4)
```

- [ ] **Step 2: Test with full valid JSON**

```bash
python3 ~/.claude/statusline.py <<'EOF'
{
  "context_window": {
    "used_percentage": 34.2,
    "context_window_size": 1000000,
    "current_usage": {
      "cache_read_input_tokens": 120000,
      "cache_creation_input_tokens": 0,
      "input_tokens": 183000,
      "output_tokens": 41000
    }
  },
  "rate_limits": {
    "five_hour": {"used_percentage": 28.1, "resets_at": 0},
    "seven_day": {"used_percentage": 14.0, "resets_at": 0}
  },
  "cwd": "/home/vixx/Proyectos/voiler"
}
EOF
```

Expected: 4 rows. Rows 1-3 have bars in color. Row 4 shows `📁 ~/Proyectos/voiler  //  🌱 <current-branch>` (or just cwd if not in a git repo). No Python traceback.

- [ ] **Step 3: Test stale fallback**

First invoke with valid data to populate state file (step 2 above does this). Then invoke with empty stdin:

```bash
echo '{}' | python3 ~/.claude/statusline.py
```

Expected: 4 rows. Bars in **greyscale** (visually lighter/greyer). Row 4 ends with `⚠ 0m` (or `⚠ 1m` if a minute has passed).

- [ ] **Step 4: Test no-state fallback (delete state file first)**

```bash
rm -f ~/.claude/.statusline-state.json
echo '{}' | python3 ~/.claude/statusline.py
```

Expected: 4 rows with zeroed greyscale bars and `📁 ?`. No crash.

- [ ] **Step 5: Verify model/effort column appears**

In the output from step 2, the third column of rows 1-3 should show:

- Row 1: `◉ sonnet[1m]` (or whatever `model` is in settings.json)
- Row 2: `◈ effort: medium` (or current effort)
- Row 3: `⟳ calibrating…` (until 5 samples accumulated)

- [ ] **Step 6: Commit**

```bash
# Only if ~/.claude is tracked by git
git -C ~/.claude add statusline.py .statusline-state.json .statusline-stats.json 2>/dev/null || true
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                       | Task      |
| ------------------------------------------------------ | --------- |
| Full-state fallback cache (`.statusline-state.json`)   | Task 2, 5 |
| Greyscale gradient when stale                          | Task 1, 5 |
| Validity check: ctx > 0 AND quota source               | Task 2, 5 |
| Stale age indicator `⚠ Xm` in row 4                    | Task 5    |
| Third column: model                                    | Task 4, 5 |
| Third column: effort                                   | Task 4, 5 |
| Third column: cost estimate `⟳ ~X%/100req`             | Task 3, 5 |
| EMA stats with `tokens_per_pct` + `avg_tokens_per_req` | Task 3    |
| Session reset detection in stats                       | Task 3    |
| `calibrating…` until MIN_SAMPLES=5                     | Task 3, 5 |
| Row 4: `📁 cwd // 🌱 branch` single line               | Task 5    |
| No branch → row 4 cwd only                             | Task 5    |
