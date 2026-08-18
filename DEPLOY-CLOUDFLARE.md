# Deploy V6.0.0: GitHub → Cloudflare Workers → Turso

## Repository root

Upload the **contents** of this project to the repository root so these are directly visible:

```text
package.json
wrangler.jsonc
src/
public/
scripts/
tests/
```

Do not upload `.env`, `.dev.vars`, `node_modules`, or Turso tokens.

## Cloudflare Git integration

Connect the GitHub repository in **Workers & Pages** and use the production branch `main`.

Build command:

```text
npm run build
```

Deploy command:

```text
npx wrangler deploy
```

The build is intentionally a release gate: it checks JavaScript syntax, the Cloudflare PBKDF2 limit, the Owner setup markup, Viewer defaults, password hashing, and an integrated `/setup` Owner/session/redirect flow.

## Runtime secrets

In the Worker **Settings → Variables & Secrets**, add:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

Optional email delivery for Forgot Password:

```text
RESEND_API_KEY
MAIL_FROM
```

These are runtime secrets, not build variables.

## After deployment

Open:

```text
/version
```

It must return:

```json
{"version":"5.0.0"}
```

Then open `/setup`. The page must visibly show:

```text
V6.0.0 · Server-rendered native form
```

If the Turso database has no users, create the Owner. Successful setup returns an HTTP 303 redirect to `/dashboard` and creates an HttpOnly session cookie.

If the Turso database already contains an Owner from an earlier attempt, `/setup` redirects to `/login`; do not delete the database just to rerun setup.


### Recommended secret
Add `AUTH_PEPPER` as a Cloudflare secret (32+ random bytes/string). Keep it permanently unchanged after users are created.
