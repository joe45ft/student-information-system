# Student IMS Next Security — V1.2.1

## Authentication and passwords

- No default credentials are included; the first account is created through `/setup` and becomes Owner.
- New passwords use PBKDF2-SHA256, a random 16-byte salt and 100,000 iterations.
- Legacy 10,000-iteration hashes remain verifiable for backward compatibility and are upgraded after a successful login.
- `AUTH_PEPPER` is supported and strongly recommended. Store it only as a Cloudflare Secret; never commit its value.
- Password changes revoke other active sessions. Administrative password resets revoke all existing sessions for the target user.

## Sessions and CSRF

- Session tokens are cryptographically random; D1 stores only SHA-256 token hashes.
- Session cookies use `Secure`, `HttpOnly`, `SameSite=Lax` and `Priority=High`.
- State-changing forms use a double-submit CSRF token.
- CSRF verification additionally rejects cross-site requests using `Origin` and `Sec-Fetch-Site` when available.
- Malformed cookie encoding is handled safely instead of generating an unhandled exception.

## Authorization

- Permissions are enforced server-side on protected routes; hiding navigation links is only a UI convenience.
- The `sessions.manage` permission is enforced on session-management endpoints.
- `reports.export` has its own report export endpoint and no longer depends on `students.export`.
- The last active Owner cannot be disabled or downgraded.
- Non-Owner administrators cannot create, downgrade or manage Owner accounts beyond the existing role constraints.

## Input and data protection

- D1 values are passed through bound parameters.
- Dynamic table/column identifiers are selected only from hardcoded internal academic-module definitions.
- Student, user, academic and settings forms have centralized server-side validation and allowlists.
- CSV imports are restricted to CSV files, 2 MB, 5,000 data rows, required headers and validated values.
- Output rendered into HTML is escaped by the shared UI utilities.

## Login abuse protection

- Failed logins are throttled separately by normalized email and hashed network fingerprint.
- Query indexes support the throttling lookups.
- Old login attempts and stale operational session/reset records are periodically pruned after successful logins.

## Response hardening

HTML responses include a restrictive CSP and security headers including HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy and no-index directives.

Technical exceptions are logged server-side with a generated reference ID; users receive a safe error page without stack traces or database details.
