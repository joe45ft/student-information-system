# V6.0.0 Full Audit

- Owner flow simplified to Create Owner -> Login -> Dashboard.
- Setup no longer creates a session, eliminating a failure point during first account creation.
- PBKDF2 work factor reduced to fit Workers Free 10 ms CPU constraints.
- Optional AUTH_PEPPER supported for password hardening.
- Turso schema initialization remains batched to stay below the 50 external-subrequest limit.
- Native POST /setup retained; no JavaScript interception.
- Explicit 303 redirects are used after setup/login.
- Build guards reject old 310000/100000 setup variants.
- Static assets, routing, permissions, CSRF, session revocation, and Owner-protection routes reviewed.
