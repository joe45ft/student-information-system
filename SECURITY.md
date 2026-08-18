# Security Notes — V5.0.0

- No default credentials are created.
- The first account is created only while the users table is empty and is assigned `OWNER` server-side.
- Passwords use PBKDF2-SHA256 with a unique random salt and **10,000 iterations**, matching the Cloudflare Workers runtime limit observed during deployment.
- Password length is 8–128 characters and requires uppercase, lowercase, and a number.
- Raw passwords are never stored or returned.
- Session tokens are cryptographically random; only SHA-256 token hashes are stored in Turso.
- Session cookies are HttpOnly, SameSite=Lax, and Secure on HTTPS.
- Disabled users cannot authenticate; existing sessions are invalidated.
- Changing a password revokes the user's other active sessions.
- Password-reset tokens are random, hashed, temporary, and single-use.
- Forgot Password uses a generic response so account existence is not disclosed.
- Login failures are throttled.
- CSRF validation is required for state-changing form submissions.
- Backend routes enforce permissions independently of navigation visibility.
- Owner effective permissions cannot be restricted by lower-level users or per-user overrides.
- Only an Owner can create/promote another Owner.
- The final active Owner cannot be disabled or demoted.
- Security-relevant actions are logged.
- Dynamic HTML uses no-store caching and security response headers, including CSP and frame protection.
- Turso credentials belong in Cloudflare runtime Secrets, never GitHub.


V6 uses PBKDF2-SHA256 at a Cloudflare-Free CPU-compatible work factor. For production, configure a long random `AUTH_PEPPER` Cloudflare secret; the pepper is never stored in Turso.
