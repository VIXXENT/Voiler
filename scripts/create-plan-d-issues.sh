#!/usr/bin/env bash
# Create deferred GitHub issues from Plan D final review
set -euo pipefail

gh issue create --title "refactor(web): eliminate as casts in favor of type-safe helpers" \
  --label "priority:high,plan-d" \
  --body "From Plan D review (D-Z2). ~15 as casts across frontend. Fix: sessionRole() helper, Zod for JSON.parse, satisfies for i18n. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "style(web): refactor i18n interpolation to use reduce instead of let" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-I1). let used in i18n.tsx interpolation loop. Refactor to Array.reduce(). Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "refactor(web): replace throw in useTranslation with safe fallback" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-I2). throw new Error in useTranslation hook. Standard React context pattern but violates no-throw mandate. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "docs(web): document TanStack Router throw redirect() as no-throw exemption" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-I3). throw redirect() is framework-mandated by TanStack Router. Document as exemption. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "fix(web): move loadSessions into useEffect or wrap in useCallback" \
  --label "priority:medium,plan-d" \
  --body "From Plan D review (D-I4). loadSessions declared in component body but not in useEffect deps. Works but incorrect per exhaustive-deps rule. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "feat(web): complete i18n integration across all components" \
  --label "priority:medium,plan-d" \
  --body "From Plan D review (D-I5). en.json has keys but AuthForm, UserList, ImpersonationBanner, sessions, admin/users use hardcoded strings. Wire up t() calls. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "refactor(web): extract shared UsersTable component" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-N1). UserList.tsx and admin/users.tsx have duplicated table markup. Extract shared component. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "fix(web): reorder UA checks so Edge is detected before Chrome" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-N2). parseUserAgent in sessions.tsx checks Chrome before Edge. Edge shows as Chrome. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "fix(web): move DevMenu inside I18nProvider" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-N3). DevMenu renders outside I18nProvider in __root.tsx. Will throw if DevMenu ever uses useTranslation(). Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "feat(web): add root-level errorComponent for route error handling" \
  --label "priority:medium,plan-d" \
  --body "From Plan D review (D-N4). No error boundary on route outlet. Unhandled errors cause white screen. Add errorComponent to createRootRoute. Ref: docs/reviews/plan-d-final-review.md"

gh issue create --title "docs(web): document intentional full-reload after impersonation stop" \
  --label "priority:low,plan-d" \
  --body "From Plan D review (D-N5). window.location.href used instead of router navigation in ImpersonationBanner and admin/users. Likely intentional to clear auth cache — needs comment. Ref: docs/reviews/plan-d-final-review.md"

echo "Done — 11 issues created."
