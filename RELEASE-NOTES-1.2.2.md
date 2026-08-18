# Student IMS Next V1.2.2 — Automatic Refresh

V1.2.2 adds safe automatic refresh without changing the database schema, permissions, routes, or existing features.

## Added
- Automatic refresh every 60 seconds on dashboard and read/list pages.
- Top-bar Auto Refresh toggle with a visible countdown.
- Device-local preference so users can turn Auto Refresh off or back on.
- Refresh pauses while the browser tab is hidden.
- Refresh pauses while the user is editing/focusing a form control.
- Refresh pauses after unsaved form changes and while a form is submitting.
- Refresh pauses while the mobile navigation is open.
- Create/edit/import/profile/settings/logout pages are intentionally excluded.

## Compatibility
- No D1 schema changes.
- No migration required.
- No dependency changes.
- Existing authentication, authorization, CSRF, PBKDF2 hotfix, and routes are preserved.
