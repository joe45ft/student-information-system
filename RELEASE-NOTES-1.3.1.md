# Student IMS Next V1.3.1 — Users & Permissions Upgrade

V1.3.1 builds directly on V1.3.0 and upgrades the existing Users & Permissions module without changing the D1 schema or removing existing functionality.

## Added

- Dedicated `/users/:id` user details page.
- Profile, Permissions, Sessions and Activity sections.
- User search by name, email or phone.
- Role and status filters with pagination.
- Effective permission count in the user list.
- Grouped permission editor with per-group Select All / Clear actions.
- Reset to Role Defaults action.
- Visible permission source: Role default, User allow or User deny.
- Administrative active-session view and revoke action.
- Confirmation prompts for role/status changes, password reset and session revocation.

## Security hardening

- Enforced role hierarchy for user administration.
- Prevented managers from assigning roles above their own role.
- Prevented managers from granting permissions they do not themselves possess.
- Preserved locked permissions when an authorized manager edits a user.
- Disabled accounts now have active sessions revoked immediately.
- Role, status and permission changes generate dedicated audit entries.
- Existing last-active-Owner protection remains in place.

## Permission storage

V1.3.1 normalizes `user_permissions` to store only values that differ from role defaults. This is backward compatible with existing full override rows because `hydratePermissions()` already combines role defaults with stored allow/deny overrides. No schema migration is needed.

## Compatibility

- Database schema: unchanged (`schema_version = 2`).
- Runtime dependencies: unchanged (zero).
- Cloudflare Worker + D1 architecture: unchanged.
- PBKDF2 Cloudflare runtime hotfix: preserved at 100,000 iterations.
- Automatic refresh: preserved.

## Validation

`npm run build` passes with 24 tests, 0 failures. New coverage includes user profiles, permission-source rendering, role escalation prevention, permission escalation prevention, account disable/session revocation and audit entries.
