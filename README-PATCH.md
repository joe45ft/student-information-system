# V6.0.2 build patch

This patch fixes the Cloudflare build failure:

`TypeError: Cannot read properties of undefined (reading 'AUTH_PEPPER')`

Changes:
- Hono setup-flow test passes `AUTH_PEPPER` through the documented 3rd `app.request()` argument.
- Auth code uses `c.env?.AUTH_PEPPER` defensively.
- Optional email bindings are null-safe.
- Version is synchronized to 6.0.2 across package, Worker and setup UI.
- Build validator no longer contains a brittle hard-coded patch version.
