# Security

- No default credentials.
- First account is Owner.
- PBKDF2-SHA256 with per-password random salt; optional `AUTH_PEPPER` is strongly recommended.
- Session tokens are random and only their SHA-256 hashes are stored.
- Cookies use Secure, HttpOnly and SameSite=Lax.
- State-changing forms use CSRF protection.
- Failed login throttling uses a hashed network fingerprint.
- Last active Owner cannot be disabled or downgraded.
- Admin password reset revokes all existing sessions for that account.
- Security headers include CSP, frame denial, nosniff and permissions policy.
