# Student IMS Next — Fresh Project

A completely new Student Information Management System for Cloudflare Workers + Cloudflare D1.

## What is different

This project does **not** use Turso, Hono, libSQL, Express, EJS, or any code from the previous project.
It uses plain Cloudflare Worker JavaScript, native HTML forms, Web Crypto, and a native D1 binding.

## Features

- First-run Owner setup with no default credentials
- Owner / Admin / Data Entry / Viewer
- Granular per-user permissions
- Last active Owner protection
- Login throttling
- CSRF protection
- Secure HttpOnly sessions + Remember Me
- Users & Permissions + admin password reset
- Password reset requests
- Student CRUD, search, CSV import and CSV export
- Batches, lecturers, subjects and groups
- Reports and activity logs
- Profile, password change and active sessions
- Organization settings
- Permission-based navigation
- Responsive UI with Flaticon UIcons
- Light / Dark / System theme switcher with saved preference
- Collapsible desktop sidebar and mobile slide-out navigation
- Comfortable / Compact layout density control
- Sticky table headers and improved responsive tables

## Clean deployment

1. Create a **brand-new GitHub repository** named `student-ims-next`.
2. Upload only the contents of this project. At repository root you should see `package.json`, `wrangler.jsonc`, `src`, `tests`, and `scripts`.
3. In Cloudflare Workers & Pages, create a **new Worker from Git** and connect the new repository.
4. Build command: `npm run build`
5. Deploy command: `npx wrangler deploy`
6. The included Wrangler configuration declares a D1 binding named `DB`. Modern Wrangler can automatically provision D1 when the binding is declared without a resource ID.
7. Recommended before creating the Owner: add a Worker secret named `AUTH_PEPPER` with a long random value. Do not commit it to GitHub.
8. Open `/health`, then `/version`, then `/setup`.

Expected flow:

`First System Setup -> Create Owner -> Login -> Dashboard`

## Do not copy from the old project

Do not add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, Hono, or `@tursodatabase/serverless`.

## D1 fallback

If automatic D1 provisioning is not available for your account, create a D1 database in Cloudflare and replace the D1 section of `wrangler.jsonc` with the database name and ID supplied by Cloudflare.
