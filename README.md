# Student IMS Next V1.3.1

Production-hardened Student Information Management System built for **Cloudflare Workers + Cloudflare D1**. The application remains server-rendered and intentionally lightweight: JavaScript ES modules, native HTML forms, Web Crypto, D1 prepared statements, and zero runtime npm dependencies.

## Architecture

`Browser -> Cloudflare Worker -> Authentication / Authorization / Validation -> D1 -> Server-rendered HTML`

Core modules:

- `src/index.js` — route composition and business flows.
- `src/router.js` — lightweight method/path router with parameter handling and 405 discovery.
- `src/db.js` — schema compatibility, permissions, audit, indexes, settings cache, operational cleanup.
- `src/security.js` — password hashing, sessions, cookies, CSRF, request fingerprinting.
- `src/validation.js` — centralized server-side form validation.
- `src/config.js` — versions, allowlists, pagination and import limits.
- `src/ui.js` / `src/client.js` — server-rendered UI, responsive CSS and progressive UX controls.
- `migrations/` — idempotent D1 production migration baseline.

The project does **not** use Turso, Hono, libSQL, Express or EJS.

## Main features

- First-run Owner setup; no default credentials.
- Owner / Admin / Data Entry / Viewer roles plus 24 granular per-user permissions.
- Last active Owner protection and server-side authorization on protected routes.
- Student CRUD, search/filter, pagination, CSV import/export.
- Batches, groups, lecturers and subjects with supported academic relationships exposed in the UI.
- User administration with dedicated user details, role/status filters, grouped effective permissions, sparse overrides, password reset, session revocation and per-user audit views.
- Reports + dedicated report-summary export.
- Activity audit log with pagination.
- Profile, password change and active-session management.
- Organization settings.
- Light / Dark / System theme, compact density, collapsible desktop navigation and mobile drawer.
- Accessible focus states, skip navigation, ARIA state, reduced-motion support and keyboard-friendly scroll tables.

## Security baseline

- PBKDF2-SHA256 with random per-password salt and 100,000 iterations for new hashes.
- Backward-compatible verification of legacy 10,000-iteration hashes; successful login transparently upgrades them.
- Optional `AUTH_PEPPER` is strongly recommended and must be stored as a Cloudflare Secret.
- Random session tokens; only SHA-256 token hashes are stored in D1.
- `Secure`, `HttpOnly`, `SameSite=Lax`, high-priority session cookies.
- Double-submit CSRF plus same-origin / fetch-site checks for state-changing requests.
- Login throttling by account email and hashed network fingerprint.
- CSP, HSTS, frame denial, nosniff, referrer policy, permissions policy and COOP headers.
- Bound D1 parameters for user-controlled values; dynamic identifiers only come from hardcoded internal module configuration.
- CSV upload size, extension, row-count and row-value validation.
- Technical exceptions are logged with a request/reference ID instead of being rendered to users.

See `SECURITY.md` for details.

## Build and test

Requires Node.js 20+.

```bash
npm run build
```

The build performs the project validator followed by the Node test suite. V1.3.1 contains the production test suite plus coverage for Student Experience, Users & Permissions profiles, search/filters, grouped permission editing, role-hierarchy enforcement, session revocation, audit events, automatic refresh, setup/login, authorization, report permissions, router behavior, CSRF, password compatibility, response headers and validation.

## D1 migrations

A non-destructive baseline migration is included at:

`migrations/0001_production_baseline.sql`

Local migration:

```bash
npm run db:migrate:local
```

Remote migration after the production D1 binding is configured:

```bash
npm run db:migrate:remote
```

The application also keeps an idempotent in-code schema compatibility path so an existing V1.1.0 database can be upgraded without deleting tables or data.

## Production Cloudflare deployment

1. Authenticate Wrangler to the intended Cloudflare account.
2. For a controlled production deployment, create or select a D1 database and bind it as `DB`. For a new database, Wrangler can write the real database name/ID into `wrangler.jsonc`:

```bash
npx wrangler d1 create student-ims-next-prod --binding DB --update-config
```

3. Add a strong secret before creating the first Owner:

```bash
npx wrangler secret put AUTH_PEPPER
```

4. Apply migrations to the bound remote D1 database:

```bash
npm run db:migrate:remote
```

5. Build and deploy:

```bash
npm run build
npm run deploy
```

6. Verify `/health`, `/version`, then `/setup` on a fresh system.

The checked-in `wrangler.jsonc` keeps the D1 binding resource ID uncommitted because it is Cloudflare-account-specific. Current Wrangler can provision draft bindings automatically, but an explicit production D1 binding is preferred for deterministic deployments.

## Operational notes

- Do not change `AUTH_PEPPER` after password hashes have been created unless a planned password migration/reset is performed.
- Prefer disabling users instead of deleting identities when audit continuity matters.
- Review Activity Log after unexpected changes.
- Keep production and staging on separate D1 databases.
- Run `npm run build` before every deployment.
- The UI icon set is loaded from Flaticon UIcons CDN; self-hosting can be considered later if a fully dependency-isolated frontend is required.

## Release documentation

- `PRODUCTION-READINESS-REPORT.md`
- `RELEASE-NOTES-1.2.2.md`
- `RELEASE-NOTES-1.3.1.md`
- `RELEASE-NOTES-1.3.0.md`
- `RELEASE-NOTES-1.2.1.md`
- `AUDIT-REPORT.md`
- `SECURITY.md`


## Automatic Refresh (V1.2.2)

Selected read-oriented pages refresh automatically every 60 seconds. The control in the top bar can disable or re-enable refresh and the preference is stored locally on the device. Refresh pauses while the tab is hidden, while a form field is active, after a form has unsaved changes, while a form is submitting, or while the mobile navigation is open. Edit/create/settings/profile pages are intentionally excluded to protect user input.


## Student Experience (V1.3.0)

- Dedicated read-only Student Profile page at `/students/:id` with permission-aware Edit/Delete actions.
- Advanced student search and filtering by status, gender, batch, group, created date and sort order.
- Upgraded dashboard with actionable statistics, assignment coverage, gender and batch distributions, quick data-quality indicators and direct student links.
- Responsive profile, filters and dashboard components without adding runtime dependencies or changing the D1 schema.


## Users & Permissions Upgrade (V1.3.1)

- Dedicated user detail page at `/users/:id` with Profile, Permissions, Sessions and Activity views.
- Search and filtering by name/email/phone, role and status with pagination.
- Permission editor grouped by functional area with Select All, Clear and Reset to Role Defaults controls.
- Role hierarchy enforcement prevents lower-privileged managers from promoting or modifying higher roles.
- Managers cannot grant permissions they do not possess themselves; locked permissions are preserved on existing accounts.
- Permission storage is normalized to sparse overrides so role defaults remain the source of truth unless a user-specific difference is required.
- Role, status and permission changes are audited independently. Disabling a user revokes active sessions immediately.
- Password resets and administrative session revocation require confirmation in the UI.
- No D1 schema change or migration is required for V1.3.1.
