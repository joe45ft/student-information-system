# V6.0.1 Build Test Fix

Fixes the Cloudflare build failure where the security test still expected a 100,000-iteration PBKDF2 hash after the runtime-compatible implementation was changed to 10,000 iterations.

Changes:
- Security test now expects `pbkdf2$10000$...`.
- Unsupported-iteration test now mutates `10000` to `310000`.
- Version markers updated to 6.0.1.
- Build validation remains enabled.
