# V5.0.0 Integrated Audit

## Critical fixes

- Removed all JavaScript interception from Owner creation. `/setup` is a native HTML POST form.
- PBKDF2 is fixed at the Cloudflare runtime-supported 100,000 iterations; the build fails if `310000` reappears.
- First-time schema initialization remains batched to stay below Cloudflare Free external-subrequest limits.
- Dynamic HTML responses use `Cache-Control: no-store` and carry `X-App-Version: 5.0.0`.
- Dependencies are pinned instead of `latest`.
- Session activity writes are throttled to once per five minutes per active session.
- Viewer defaults are corrected to read-only educational data, without Reports by default.
- Audit logging failures no longer prevent successful login/logout/Owner setup.
- POST success redirects use HTTP 303 in the critical authentication path.

## Security checks

- Server-side permission enforcement remains mandatory for protected routes.
- Owner full access cannot be overridden by per-user permission rows.
- Last active Owner protections remain in place.
- Disabled users are rejected and their session is invalidated.
- Password reset tokens remain hashed, temporary and single-use.
- CSRF token validation remains on state-changing forms.
- Security response headers and a restrictive CSP were added.
- Passwords are capped at 128 characters to avoid abusive hashing workloads.

## Functional corrections

- My Profile now supports profile editing.
- Account menu includes Change Password.
- Changing a password revokes the user's other active sessions.
- Reports expose Print only when `reports.print` is allowed.
- Users table now includes Created Date and an obvious View entry point.
- A favicon is served as a static asset so browsers do not unnecessarily invoke database middleware for `/favicon.ico`-style discovery.

## Automated build gates

`npm run build` now executes:

1. Project structure and syntax audit.
2. Password hashing/verification test.
3. Integrated Hono Owner setup flow test using a fake Turso-compatible database adapter.

A failed core authentication test stops Cloudflare deployment.
