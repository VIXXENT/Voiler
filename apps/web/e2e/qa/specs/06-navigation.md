# Spec 06 — Navigation

## Overview

Navigation in TaskForge relies on a persistent sidebar for authenticated pages. Unauthenticated
pages have a minimal header. This spec covers how the user moves around the app and what they
always expect to find.

---

## Scenarios

### 06-A — Sidebar: always visible on authenticated pages

**Starting point:** User is logged in and on any authenticated page.

**What the user always sees (sidebar):**

- The app name "TaskForge" (or logo) — links back to `/projects` or `/`
- A "Projects" link
- A "Billing" link
- A "Settings" link
- A "Sign Out" button at the bottom

**UX expectations:**

- The sidebar must be visible on every authenticated page without scrolling
- The sidebar must NOT appear on login or register pages
- All sidebar links must work (no 404s, no broken routes)

---

### 06-B — Active link highlighting

**Starting point:** User is on the `/projects` page.

**What the user sees:**

- The "Projects" sidebar link appears visually different from the others (e.g. bold, highlighted
  background, colored indicator)

**When on `/billing`:**

- The "Billing" link is highlighted

**When on a project detail page (`/projects/:id`):**

- The "Projects" link should still be highlighted (the user is in the projects section)

**UX expectations:**

- Active state must be clearly distinguishable from inactive links
- A user should always be able to tell which section of the app they're in

---

### 06-C — Project detail tab navigation

**Starting point:** User is on a project detail page.

**What the user sees:**

- Three tab-style links: "Tasks", "Members", "Settings" (these are project-scoped tabs,
  not the global sidebar links)

**What the user does:**

1. Clicks "Members" tab

**Expected outcome:**

- The Members content loads
- The "Members" tab appears active

2. Clicks "Settings" tab

**Expected outcome:**

- The Settings content loads
- The "Settings" tab appears active

3. Clicks "Tasks" tab

**Expected outcome:**

- The task list reappears
- The "Tasks" tab appears active

**UX expectations:**

- Tab switching should feel instant (no visible loading spinner needed for small data)
- The active tab must be clearly differentiated from inactive tabs

---

### 06-D — App name / logo link

**Starting point:** User is on any authenticated page.

**What the user does:**

1. Clicks the "TaskForge" name or logo in the top of the sidebar

**Expected outcome:**

- User is taken to `/projects` or the home page
- No broken navigation

---

### 06-E — Sign Out button

**Starting point:** User is on any authenticated page.

**What the user sees:**

- A "Sign Out" button in the sidebar (typically at the bottom)

**What the user does:**

1. Clicks Sign Out

**Expected outcome:**

- User is logged out
- User is redirected to the home page or login page
- Sidebar disappears

**UX expectations:**

- Sign Out must be reachable without scrolling the sidebar
- After sign out, clicking the back button should not restore the authenticated session

---

### 06-F — Unauthenticated page navigation

**Starting point:** User visits `/` (home page) without being logged in.

**What the user sees:**

- A minimal header or navigation bar
- "Login" link
- "Register" link
- NO sidebar

**UX expectations:**

- Login and Register links must be visible above the fold
- No sidebar or authenticated controls should appear

---

### 06-G — No dead ends or broken links

**What to verify across the entire app:**

- Every link in the sidebar goes to a valid page (no 404)
- Every tab in project detail works
- Clicking the browser back button from a project detail returns to the projects list
- There are no pages that leave the user with no way to navigate away

---

## Global UX Expectations for Navigation

- Sidebar is always present and consistent on authenticated pages
- Active state is always clear
- No link leads to an empty or broken page
- Sign Out is always accessible without scrolling
- Tab navigation within project detail does not cause a full page reload
- The app name always links home
