# V6.0.2 Build and setup test fix

- Hono test now passes `AUTH_PEPPER` as the third `app.request()` argument.
- Runtime auth code safely reads `c.env?.AUTH_PEPPER`.
- Email helper tolerates missing optional email bindings.
- Build validator derives the application version from `package.json` and checks index/wrangler/setup consistency.
- Setup flow remains: Create Owner -> 303 Login -> Login -> Dashboard.
