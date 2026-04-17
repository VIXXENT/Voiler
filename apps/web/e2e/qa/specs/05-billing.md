# Spec 05 — Billing

## Overview

The Billing page shows the user their current subscription plan and allows them to upgrade or
cancel. In development/staging environments, the Stripe integration may show a stub URL rather
than a real checkout page — this is expected behavior.

---

## Scenarios

### 05-A — Billing page: Free plan view

**Starting point:** User on a Free plan navigates to `/billing` via the sidebar.

**What the user sees:**

- The page title "Billing" or "Subscription"
- Their current plan clearly labeled as "Free"
- The limits of the Free plan displayed:
  - 3 projects maximum
  - 5 members per project
  - 50 tasks per project
- An "Upgrade to Pro" button (prominently placed)

**UX expectations:**

- The current plan should be unambiguous — user should not have to guess
- Limits should be listed clearly so users understand what they're getting
- The upgrade button should be easy to find without scrolling

---

### 05-B — Upgrade to Pro: initiation

**Starting point:** User on a Free plan is on the Billing page.

**What the user does:**

1. Clicks "Upgrade to Pro"

**Expected outcome:**

- The user is redirected to a Stripe checkout page (or in development, a stub URL is shown)
- In production: a real Stripe checkout page loads for payment
- In development/staging: the redirect may be to a placeholder URL — this is acceptable

**UX expectations:**

- The redirect should happen within 2 seconds
- If an error occurs (e.g. Stripe is unavailable), a clear error message is shown

---

### 05-C — Billing page: Pro plan view

**Starting point:** User has an active Pro plan subscription.

**What the user sees:**

- Their current plan labeled as "Pro"
- Confirmation that limits are removed: "Unlimited projects", "Unlimited members", etc.
- A "Cancel Subscription" button
- Optionally: the renewal date or billing period

**UX expectations:**

- Pro status should feel premium — visually positive treatment
- The cancel button should be present but not as prominent as the upgrade CTA on the Free view

---

### 05-D — Cancel subscription

**Starting point:** Pro plan user clicks "Cancel Subscription".

**Expected outcome:**

- A confirmation is shown (dialog or Stripe portal redirect) before anything is cancelled
- The user must explicitly confirm — no accidental cancellation

**UX expectations:**

- Cancellation should require at least one confirmation step
- After confirming, the user should see feedback (success message or redirect)

---

### 05-E — Billing page is accessible from sidebar

**Starting point:** User is on any authenticated page.

**What the user does:**

1. Looks at the sidebar
2. Finds and clicks the "Billing" link

**Expected outcome:**

- User arrives at `/billing`
- The Billing page loads correctly

---

## Global UX Expectations for Billing

- The current plan must always be clearly labeled (never ambiguous)
- Upgrade path should be obvious and accessible in 1 click from the Billing page
- Limits for the Free plan must be listed explicitly
- Nothing on this page should cause irreversible actions without confirmation
