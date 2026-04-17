# Spec 01 — Authentication

## Overview

Authentication is the gateway to TaskForge. A new visitor must register before accessing any
authenticated page. A returning user logs in with their credentials. Both flows should feel
fast, clear, and forgiving.

---

## Scenarios

### 01-A — Registration: happy path

**Starting point:** User visits `/auth/register` (or clicks "Register" from the home page).

**What the user sees:**

- A clean registration form with four fields: Name, Email, Password, Confirm Password
- A "Register" (or "Sign Up") button
- A link to the login page for users who already have an account

**What the user does:**

1. Fills in their full name (e.g. "Jane Smith")
2. Fills in a valid email (e.g. "jane@example.com")
3. Fills in a strong password (e.g. "SecurePass123!")
4. Fills in the same password in the confirm password field
5. Clicks Register

**Expected outcome:**

- The form submits without errors
- The user is redirected to `/projects`
- The projects page shows an empty state (no projects yet)
- The sidebar is visible with the user's name or initials

**UX expectations:**

- No more than 3 clicks from the home page to complete registration
- All fields should have visible labels — not just placeholder text
- The form should be vertically stacked, easy to tab through

---

### 01-B — Registration: password mismatch

**Starting point:** User is on the registration form.

**What the user does:**

1. Fills in name and email
2. Fills in a password
3. Fills in a DIFFERENT value in the confirm password field
4. Clicks Register

**Expected outcome:**

- The form does NOT submit
- An error message appears near the confirm password field (or at the top of the form)
- The error clearly explains the passwords do not match
- The user stays on the registration page

**UX expectations:**

- Error appears without a full page reload
- The existing field values are preserved (user does not lose name/email)

---

### 01-C — Registration: email already in use

**Starting point:** User tries to register with an email that belongs to an existing account.

**Expected outcome:**

- An error is shown explaining the email is already registered
- A link or suggestion to log in instead is shown
- The user stays on the registration page

---

### 01-D — Login: happy path

**Starting point:** User visits `/auth/login`.

**What the user sees:**

- A form with Email and Password fields
- A "Log In" (or "Sign In") button
- A link to the registration page

**What the user does:**

1. Fills in a valid registered email
2. Fills in the correct password
3. Clicks Log In

**Expected outcome:**

- User is redirected to `/projects`
- The sidebar is visible and shows authenticated navigation

**UX expectations:**

- Redirect happens within 2 seconds of clicking
- No intermediate loading pages

---

### 01-E — Login: invalid credentials

**Starting point:** User is on the login page.

**What the user does:**

1. Fills in an email that does not exist, or the wrong password for a valid email
2. Clicks Log In

**Expected outcome:**

- The user STAYS on `/auth/login` — no redirect
- An error message is shown (e.g. "Invalid email or password")
- The password field is cleared; the email field retains its value

**UX expectations:**

- Error should be clearly visible without scrolling
- The message should not reveal which part was wrong (security — do not say "email not found")

---

### 01-F — Logout

**Starting point:** User is logged in and on any authenticated page.

**What the user does:**

1. Finds and clicks the "Sign Out" button (located in the sidebar, typically at the bottom)

**Expected outcome:**

- The user is returned to the home page (`/`) or the login page
- The sidebar disappears — the page shows public navigation instead
- If the user tries to navigate back to `/projects`, they are redirected to login

**UX expectations:**

- Sign Out button should always be visible in the sidebar without scrolling
- Logout should be instant — no confirmation dialog needed

---

### 01-G — Session persistence

**Starting point:** User logs in successfully.

**What the user does:**

1. Closes the browser tab
2. Reopens the app at `/projects`

**Expected outcome:**

- The user is still logged in — no need to enter credentials again
- The session persists until the user explicitly signs out

---

## Global UX Expectations for Auth

- Forms must have visible, descriptive labels (not just placeholder text that disappears when typing)
- Error messages must be visible without scrolling
- Password fields must mask input by default
- No more than 3 clicks to complete registration from the home page
- No more than 2 clicks to complete login from the home page
- The "Register" and "Login" links must be clearly visible on the home page when not authenticated
