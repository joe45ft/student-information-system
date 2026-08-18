# Student Information Management System V6.0.1

Production target: **GitHub → Cloudflare Workers → Turso**.

V5 is a consolidated release, not another incremental hotfix. The Cloudflare build runs automated checks for the exact setup-flow and PBKDF2 failures previously encountered.

## Required secrets

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Optional email reset delivery:

- `RESEND_API_KEY`
- `MAIL_FROM`

## Cloudflare build settings

Build command: `npm run build`

Deploy command: `npx wrangler deploy`

## Verify the deployed release

Open `/version`. It must return `{"version":"5.0.0"}`.

Open `/health`. It must report version `5.0.0`.

The setup page visibly contains `V6.0.1 · Server-rendered native form`.


## Cloudflare Free authentication note

V6 is optimized for the 10 ms CPU budget on Workers Free. Add an optional `AUTH_PEPPER` secret in Cloudflare for stronger password protection. If you enable it, do not change or remove it later because existing password hashes depend on it.
