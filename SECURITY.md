# Security Notes

- No default Owner/Admin credentials.
- First Owner can be created only while the users table is empty.
- Passwords are PBKDF2-SHA256 hashes with unique random salts and 310,000 iterations.
- Raw passwords are never stored.
- Session tokens are cryptographically random; only SHA-256 hashes are stored in Turso.
- Session cookie is HttpOnly, SameSite=Lax and Secure on HTTPS.
- CSRF double-submit protection is applied to state-changing forms.
- Disabled accounts lose active sessions.
- Reset tokens are random, hashed, expiring and single-use.
- Forgot Password returns a generic response.
- Repeated login failures trigger temporary throttling.
- Permissions are enforced server-side.
- Owner privilege rules are enforced server-side.
- The final active Owner cannot be disabled or demoted.
- Security-relevant actions are recorded in activity logs.
- Turso credentials belong in Cloudflare Secrets, never GitHub.
