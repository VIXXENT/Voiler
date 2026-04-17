# Spec 04 — Members

## Overview

Every project has a Members tab where the project Owner can manage who has access to the project
and what they can do. Members and Viewers can see the tab but cannot make changes.

---

## Scenarios

### 04-A — Members tab: initial state (owner only)

**Starting point:** User navigates to a project's Members tab. No one else has been invited.

**What the user sees:**

- A list of project members
- The current user (the Owner) appears as the first and only entry
- The Owner entry shows:
  - The user's name or email
  - An "Owner" badge or label
  - No "Remove" button (can't remove the owner)

**UX expectations:**

- The Owner entry should be visually distinct (e.g. badge, position at top)
- If no other members, a prompt to invite someone should be visible or accessible

---

### 04-B — Invite member: happy path

**Starting point:** User (who is the project Owner) is on the Members tab.

**What the user does:**

1. Finds and clicks the "Invite Member" button
2. A form or dialog appears
3. Enters a User ID (the system uses User ID for invites, not email — this is an important
   UX note: the user must know the other person's User ID)
4. Selects a role: "Member" or "Viewer"
5. Clicks "Invite" or "Add"

**Expected outcome:**

- The invited user appears in the members list immediately
- Their entry shows name (or user ID), role badge, and a "Remove" button
- The invite form clears or closes

**UX expectations:**

- Role selector should default to "Member" (the more permissive role)
- User ID requirement may be confusing — any hint or label explaining what to enter helps
- The invite action should take no more than 2 interactions

---

### 04-C — Members list: multiple members

**Starting point:** Project has the Owner plus at least one invited member.

**What the user sees for each non-owner member:**

- Name or user identifier
- Role badge: "Member" or "Viewer"
- A way to change the role (dropdown or button)
- A "Remove" button

**What the user sees for the Owner row:**

- Name
- "Owner" badge
- No role change or remove option

**UX expectations:**

- Owner row should always appear first
- Role badges should be color-coded for easy reading

---

### 04-D — Change member role

**Starting point:** Owner is viewing the Members tab with at least one non-owner member.

**What the user does:**

1. Finds a member's role badge or a role dropdown
2. Changes the role from "Member" to "Viewer" (or vice versa)

**Expected outcome:**

- The role badge updates immediately
- No page reload required
- A success indication (toast notification or inline update) is shown or the update is silent
  but clearly reflected

---

### 04-E — Remove member

**Starting point:** Owner is viewing the Members tab with at least one non-owner member.

**What the user does:**

1. Clicks "Remove" next to a member
2. A confirmation dialog appears: "Are you sure you want to remove [name]?"
3. Clicks "Confirm" or "Remove"

**Expected outcome:**

- The member disappears from the list
- No page reload required

**UX expectations:**

- Confirmation is required to prevent accidental removal — this is expected behavior
- Cancel option must be present in the confirmation dialog
- After removal, the remaining members list is still visible (no blank state if Owner remains)

---

### 04-F — Non-owner cannot manage members

**Starting point:** A user who is a Member (not Owner) navigates to the Members tab.

**What the user sees:**

- The members list (read-only)
- No "Invite Member" button
- No "Remove" button on any row
- No role change controls

**UX expectations:**

- It should be clear the user is viewing in read-only mode, but not in an alarming way
- The tab should still be accessible to Members/Viewers — they should know who else is on the project

---

### 04-G — Plan limit: maximum members

**Starting point:** Free plan project already has 5 members (including the Owner).

**What the Owner does:**

1. Tries to invite a 6th member

**Expected outcome:**

- An error message explains the free plan member limit (5 per project)
- A prompt to upgrade to Pro is shown
- The invitation does not go through

---

## Global UX Expectations for Members

- The Owner must always be identifiable at a glance
- Role labels ("Owner", "Member", "Viewer") must be clearly visible per row
- The invite flow should not require more than 3 interactions
- Removal always requires confirmation — no accidental one-click removals
