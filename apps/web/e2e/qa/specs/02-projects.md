# Spec 02 — Projects

## Overview

The Projects page is the main dashboard after login. It shows all projects the user owns or
belongs to, and allows creating new ones. It is the hub from which all project work begins.

---

## Scenarios

### 02-A — Projects list: empty state

**Starting point:** User has just registered (no projects yet) and is on `/projects`.

**What the user sees:**

- A heading or title making it clear this is the Projects page
- A friendly empty-state message (e.g. "You don't have any projects yet" or similar)
- A prominent "New Project" button — visible without scrolling
- The sidebar with navigation links

**UX expectations:**

- The empty state should not feel like an error — it should encourage creating a first project
- The "New Project" button should be the most prominent call-to-action on the page

---

### 02-B — Create project: happy path

**Starting point:** User is on the `/projects` page.

**What the user does:**

1. Clicks "New Project"
2. A dialog/modal opens with a form
3. Fills in the project name (e.g. "My First Project")
4. Optionally fills in a description
5. Clicks "Create"

**Expected outcome:**

- The dialog closes
- The new project appears in the projects list immediately (without page refresh)
- The project card shows the correct name
- The project status badge shows "Active"

**UX expectations:**

- Dialog should open within 1 second of clicking "New Project"
- Name field should auto-focus when the dialog opens
- Maximum 2 clicks to create a project (click "New Project" → fill name → click "Create")
- After creation, the user should NOT need to scroll to find the new project

---

### 02-C — Create project: name required

**Starting point:** User opens the "New Project" dialog.

**What the user does:**

1. Leaves the name field empty
2. Clicks "Create"

**Expected outcome:**

- The form does NOT submit
- A validation error appears near the name field: "Name is required" or similar
- The dialog remains open

---

### 02-D — Projects list: with projects

**Starting point:** User has at least one project.

**What the user sees on each project card:**

- Project name (prominently displayed)
- Status badge — "Active" for normal projects, "Archived" for archived ones
- A "Frozen" badge if the project is frozen (read-only)
- A way to navigate to the project (clicking the card or a link)

**UX expectations:**

- Cards should be visually distinct and easy to scan
- Status and frozen badges should use color coding (e.g. green for active, gray for archived)
- The entire card area (or a clearly labeled link) should be clickable to go to the project

---

### 02-E — Plan limit: free plan maximum projects

**Starting point:** User has a Free plan account with exactly 3 projects already created.

**What the user does:**

1. Clicks "New Project"
2. Fills in the name
3. Clicks "Create"

**Expected outcome:**

- An error message appears explaining the free plan limit has been reached
- The message should suggest upgrading to Pro to create more projects
- The dialog may remain open with the error, or close with a toast/notification

**UX expectations:**

- The error should clearly state the limit (e.g. "Free plan allows 3 projects")
- There should be a visible path to upgrade (link or button to the Billing page)

---

### 02-F — Navigating to a project

**Starting point:** User is on `/projects` with at least one project in the list.

**What the user does:**

1. Clicks on a project card

**Expected outcome:**

- User is taken to the project detail page
- The URL changes to `/projects/:id` (some unique project identifier)
- The project name appears as the page title or heading
- The three tabs (Tasks, Members, Settings) are visible

---

## Global UX Expectations for Projects

- The "New Project" button must always be visible on the projects page (above the fold)
- Project cards must clearly indicate status at a glance
- Creating a project should take no more than 2 clicks plus filling the name
- The projects list should update immediately after creation — no manual refresh needed
- An empty project list must never look like a broken or error state
