# Student IMS Next V1.2.1 — Cloudflare PBKDF2 Hotfix

V1.2.1 is a focused production hotfix for V1.2.0. No database schema, route, permission, UI, or API behavior is removed.

## Fixed

- Reduced the production PBKDF2-SHA256 target from 210,000 to 100,000 iterations because the Cloudflare Workers WebCrypto runtime rejects values above 100,000.
- Preserved verification of existing legacy 10,000-iteration password hashes.
- Successful login with a legacy hash now upgrades it safely to a 100,000-iteration hash.
- Capped accepted stored PBKDF2 iteration metadata at 100,000 so unsupported values cannot trigger a Worker runtime exception.
- Added a regression test and build-time validator guard to prevent a future iteration count above the Cloudflare runtime ceiling.

## Compatibility

- No D1 schema change.
- No migration change required.
- Existing V1.1.0 10,000-iteration hashes remain valid and auto-upgrade on successful login.
- Existing routes, roles, permissions, session behavior, CSRF protection and UI remain unchanged.

## Important note

If a password hash with an iteration count above 100,000 was created outside Cloudflare and imported into D1, Cloudflare cannot verify it with its WebCrypto PBKDF2 implementation. That user's password must be reset to generate a supported hash.
