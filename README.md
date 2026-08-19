# Student IMS Next V1.4.3

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
- Owner / Admin / Data Entry / Viewer roles plus 30 granular per-user permissions.
- Last active Owner protection and server-side authorization on protected routes.
- Student CRUD, search/filter, pagination, CSV import/export.
- Connected academic network: Batches, Groups, Students, Subjects, Lecturers, Terms/Semesters, Course Offerings and real Enrollments.
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

The build performs the project validator followed by the Node test suite. V1.4.3 covers Terms/Semesters, Course Offerings, central and per-offering enrollment, cohort consistency, student placement protection, enhanced CSV placement import, session revocation, production diagnostics and schema version 4 while retaining all previous security and regression coverage.

## D1 migrations

Non-destructive migrations are included at:

- `migrations/0001_production_baseline.sql`
- `migrations/0002_academic_network.sql`
- `migrations/0003_completion_and_stability.sql`

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

For an existing installation, **do not create a replacement D1 database**. V1.4.3 deliberately blocks `npm run deploy` until the existing production D1 database is pinned by exact name and ID.

1. Authenticate Wrangler to the intended Cloudflare account and list D1 databases:

```bash
npx wrangler d1 list
```

2. Configure this project with the **existing** production database values:

```bash
npm run configure:production -- --database-name YOUR_EXISTING_D1_NAME --database-id YOUR_EXISTING_D1_UUID
```

3. Run the production safety check:

```bash
npm run deploy:check
```

4. Make sure `AUTH_PEPPER` is configured as a Cloudflare Secret. On a fresh installation, set it before creating the first Owner:

```bash
npx wrangler secret put AUTH_PEPPER
```

5. Build and test:

```bash
npm run build
```

6. Apply the additive D1 migrations to the pinned remote database:

```bash
npm run db:migrate:remote
```

7. Deploy the existing Worker explicitly:

```bash
npm run deploy
```

8. Verify `/health`. V1.4.3 reports the D1 binding, current schema, expected schema and whether a migration is still required. Then verify `/version`, sign in, and confirm Terms / Semesters, Course Offerings and Enrollments.

The Worker name is fixed to `student-information-system` to match the existing production Worker seen during troubleshooting. The checked-in config intentionally does not guess your account-specific D1 name or UUID; use the configuration command above before production deployment.

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
- `RELEASE-NOTES-1.3.3.md`
- `RELEASE-NOTES-1.4.0.md`
- `RELEASE-NOTES-1.4.2.md`
- `V1.4.1-COMPLETION-REPORT.md`
- `V1.4.2-ACTIONS-REPORT.md`
- `RELEASE-NOTES-1.4.3.md`
- `V1.4.3-AUTOMATIC-CODES-REPORT.md`
- `V1.4.0-IMPLEMENTATION-SUMMARY.md`
- `RELEASE-NOTES-1.3.4.md`
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


## Navigation & UI Harmony (V1.3.3)

- Sidebar navigation is grouped by function so related modules read as one system instead of isolated links.
- Academic Structure connects Batches, Groups, Lecturers and Subjects with a restrained visual rail.
- Navigation icon boxes, row heights, spacing, typography, hover and active states are standardized.
- Account actions are separated from operational modules and remain anchored at the bottom when space allows.
- Collapsed and mobile navigation retain the same permissions and behavior.
- Topbar/page spacing was refined to match the new sidebar proportions.
- No D1 schema, permission, route or API change is required for V1.3.3.


## Lecturer Connections (V1.3.3)

- Added a dedicated lecturer profile with contact details, assigned-subject counts, record metadata, and subject links.
- Lecturer records now expose the existing phone field in the UI.
- Subjects link back to their lecturer, and lecturer profiles filter the Subjects module to the selected lecturer.
- Added a visual academic relationship: Lecturer → Subject → Enrollment → Student. Enrollment/Student linkage remains intentionally deferred to V1.4.0 so no inaccurate direct lecturer-student relation is introduced.
- No D1 schema migration or new runtime dependency is required.


## Connected Academic UI (V1.3.4)
- Batch, Group and Subject now have dedicated profile pages.
- Students link directly to their Batch and Group.
- Lecturer subjects link directly to Subject profiles.
- Academic list pages expose connected record counts and direct related-record navigation.
- Groups support Batch filtering.
- No D1 schema change is required.


## Academic Network (V1.4.0)

V1.4.0 introduces a central **Course Offering** entity so the academic model is no longer split into unrelated chains. A Course Offering connects one Subject and Term with its actual Lecturer and optional Batch/Group cohort. Students then join that class through real Enrollment records.

Core flow:

`Batch / Group + Subject + Lecturer + Term → Course Offering → Enrollment → Student`

The model preserves the existing `subjects.lecturer_id` field as a backward-compatible default lecturer, while actual teaching assignments are stored on Course Offerings. Enrollment eligibility is checked server-side against the selected Group or Batch. This schema is the foundation for Attendance in V1.5.0 and Grades & Assessments in V1.6.0.
