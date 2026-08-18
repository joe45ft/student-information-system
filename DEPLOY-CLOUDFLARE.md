# Deploy from GitHub to Cloudflare Workers

## 1. Put V4 in your GitHub repository

Repository root must contain:

```text
package.json
wrangler.jsonc
src/
public/
scripts/
```

Do not upload `.dev.vars`, `.env`, `node_modules`, or secrets.

## 2. Connect GitHub in Cloudflare

Open Cloudflare → Workers & Pages and import/connect the GitHub repository.

Production branch:

```text
main
```

The project already contains `wrangler.jsonc`.

## 3. Build settings

Build command:

```text
npm run build
```

Deploy command:

```text
npx wrangler deploy
```

The build command copies the installed Flaticon UIcons package into `public/vendor/flaticon` before deployment.

## 4. Runtime Variables & Secrets

Open the Worker → Settings → Variables & Secrets.

Add as encrypted secrets:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

Optional password reset email:

```text
RESEND_API_KEY
MAIL_FROM
```

## 5. Redeploy

Redeploy after saving the Turso secrets.

Each future push to the connected production branch can trigger a new Cloudflare build and deploy.

## 6. First visit

Open the generated workers.dev address.

A fresh Turso database redirects to `/setup`. Create the first Owner. No default credentials exist.

## 7. Database tables

No manual SQL setup is required. The Worker runs safe `CREATE TABLE IF NOT EXISTS` statements and seeds permission definitions automatically.
