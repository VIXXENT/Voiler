# Spec 03 — Project Detail

## Overview

The project detail page is where the day-to-day work happens. It has three tabs: Tasks,
Members, and Settings. Tasks is the default view. This spec covers the Tasks tab in full;
Members and Settings each have their own spec files.

---

## Scenarios

### 03-A — Project detail page structure

**Starting point:** User navigates to any project from the projects list.

**What the user sees:**

- The project name as the page title or a prominent heading
- Three tab links: Tasks, Members, Settings
- The Tasks tab is active by default (highlighted or underlined)
- The sidebar remains visible

**UX expectations:**

- All three tabs must be visible without scrolling
- The active tab should be clearly distinguishable from inactive ones
- Clicking a tab should switch the content below without a full page reload

---

### 03-B — Tasks tab: empty state

**Starting point:** User is on a newly created project (no tasks yet).

**What the user sees:**

- The Tasks tab is active
- A friendly empty-state message (e.g. "No tasks yet" or "Create your first task")
- A "New Task" button — visible and prominent

**UX expectations:**

- Empty state must not look like an error
- "New Task" button should be the primary call-to-action

---

### 03-C — Create task: happy path

**Starting point:** User is on a project's Tasks tab.

**What the user does:**

1. Clicks "New Task"
2. A dialog opens with a form
3. Fills in the task title (required)
4. Optionally fills in a description
5. Optionally selects a priority (Low / Medium / High)
6. Optionally sets a due date
7. Clicks "Create"

**Expected outcome:**

- The dialog closes
- The new task appears in the task list immediately
- The task shows its title
- The task shows a status badge: "To Do" (default initial status)
- If a priority was set, a priority badge is shown

**UX expectations:**

- Title field should auto-focus when dialog opens
- Maximum 2 clicks to create a task (click "New Task" → fill title → click "Create")
- Task appears at the top or bottom of the list consistently

---

### 03-D — Create task: title required

**Starting point:** User opens the "New Task" dialog.

**What the user does:**

1. Leaves the title field empty
2. Clicks "Create"

**Expected outcome:**

- Form does not submit
- A validation error appears: "Title is required" or similar
- Dialog stays open

---

### 03-E — Task item display

**Starting point:** User is on a project with at least one task.

**What the user sees for each task:**

- Task title (readable, not truncated for short titles)
- Status badge: "To Do", "In Progress", or "Done"
- Priority badge (Low / Medium / High) — if a priority was set
- Some way to interact with the task (dropdown, button, or clickable area)

**UX expectations:**

- Status should be color-coded for quick scanning (e.g. blue for In Progress, green for Done)
- Priority should be visually distinct per level (e.g. red for High)
- The task row/card must not look cluttered

---

### 03-F — Task status transition

**Starting point:** User is on a project's Tasks tab with at least one task showing "To Do".

**What the user does:**

1. Finds a task with status "To Do"
2. Clicks the status control (could be a dropdown button, a "..." menu, or directly the status badge)
3. Selects "In Progress"

**Expected outcome:**

- The task status badge updates to "In Progress" immediately
- No page reload required

**What the user does next:** 4. Clicks the status control again 5. Selects "Done"

**Expected outcome:**

- The task status badge updates to "Done"

**UX expectations:**

- Changing task status should take no more than 2 clicks
- The dropdown/menu should show all available statuses
- The current status should be visually indicated in the dropdown

---

### 03-G — Tasks tab: with multiple tasks

**Starting point:** User has several tasks in varying states.

**What the user sees:**

- All tasks listed (no pagination needed for < 20 tasks)
- Each task row shows title, status badge, and priority badge
- Tasks in different statuses are visually distinguishable

**UX expectations:**

- Tasks should be scannable — one task per row is preferred over a grid
- If filtering or sorting is available, controls should be clearly labeled

---

## Global UX Expectations for Project Detail

- Tab navigation must not cause data loss (e.g. switching to Members and back should retain task list)
- All actions (create task, change status) must reflect immediately without manual refresh
- The project name in the heading should always match what was created
- No "back" button needed — the sidebar Projects link always takes the user back to the list
