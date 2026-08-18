# V4.0.3 Cloudflare PBKDF2 Hotfix

Fixes:

`NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported`

Changes:
- Password hashing now uses PBKDF2-SHA256 with 100,000 iterations.
- Password verification safely rejects malformed or unsupported iteration counts.
- No Turso database reset is required.
- The failed Owner setup attempts did not create a user because hashing occurs before the user INSERT.
