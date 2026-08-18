# Student Information Management System V4

Architecture: **GitHub Repository → Cloudflare Workers → Turso**

Cloudflare-native edition using Hono and Turso. No Express server, Render, Koyeb, VPS, or persistent local filesystem is required.

## Features

- First-run Owner setup
- Owner / Admin / Data Entry / Viewer roles
- Granular per-user permissions
- Secure opaque sessions in Turso
- Remember Me
- Logout / Logout from all devices
- PBKDF2-SHA256 password hashing using Web Crypto
- Forgot/reset password with expiring single-use tokens
- Optional password-reset email through Resend
- Login throttling
- CSRF protection
- Last-active-Owner protection
- Users & Permissions
- Students CRUD + search + CSV import/export
- Batches, Lecturers, Subjects, Groups
- Reports
- Activity logs
- Organization settings
- Responsive UI
- Flaticon UIcons with visible attribution

## Required Cloudflare secrets

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

Optional email delivery:

```text
RESEND_API_KEY
MAIL_FROM
```

## Local development

Create `.dev.vars`:

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Then:

```bash
npm install
npm run dev
```

Open `http://localhost:8787`.

## GitHub deployment

Read `DEPLOY-CLOUDFLARE.md`.
