# Student IMS Next V1.4.1 — Complete Stabilization

V1.4.1 is a corrective and completion release built on V1.4.0. It keeps the existing Cloudflare Workers + D1 architecture and does not remove working features.

## Production deployment safety
- Worker deployment target is fixed to the existing `student-information-system` Worker.
- Added `scripts/predeploy.mjs`; production deployment is blocked until the existing D1 database is pinned by exact `database_name` and `database_id`.
- Added `npm run configure:production` to safely write the existing D1 values to `wrangler.jsonc` without guessing them.
- `/health` now reports D1 binding state, current schema version, expected schema version, and `migration_required`.
- Settings now includes a Production Diagnostics panel.

## Academic network completion
- Added a dedicated `Enroll Student` flow at `/enrollments/new` in addition to per-offering enrollment.
- Added direct enrollment actions from Student Profile, Course Offering and the Enrollment directory.
- Active Course Offerings now require active Subject, Term, Lecturer, Batch and Group records when those relations are selected.
- Student Batch/Group changes are blocked when they would invalidate active enrollments.
- Course Offering cohort changes are blocked when they would invalidate active enrolled students.
- Reactivating an enrollment re-runs eligibility checks.
- Students and Course Offerings cannot be marked inactive while active enrollments remain.
- Related academic records cannot be marked inactive while active Course Offerings depend on them.
- Duplicate Term codes and Course Offering codes are rejected; Batch/Subject codes and Lecturer emails are also checked at the application layer when supplied.

## Students
- Student form now filters Groups according to selected Batch.
- CSV import now supports `gender`, `birth_date`, `batch`, `batch_code`, `group`, `status`, and `notes` in addition to the previous fields.
- CSV placement changes that would conflict with active enrollments are skipped and reported.
- Student deletion now warns about related enrollment history and requires explicit confirmation before cascading related enrollments.

## Dashboard, reports and audit
- Dashboard is permission-aware and now includes Terms, Course Offerings and Enrollment statistics.
- Added academic network summary and quick enrollment action.
- Reports now include Enrollment status, Course Offerings by Term, active enrollment by Subject and Lecturer teaching load.
- Report CSV export includes the academic summaries.
- Activity Log now supports search, Action, Entity and date filters.

## Sessions and settings
- Active Sessions identifies the current session.
- Added per-device session revoke while protecting the current session from accidental revoke through that action.
- Organization Name is now required server-side.
- Settings shows version, Worker identity, D1 connectivity, schema health and AUTH_PEPPER state without exposing secret values.

## Database and performance
- Schema version is now 4.
- Added migration `migrations/0003_completion_and_stability.sql`.
- Added targeted indexes for academic list/filter paths and enrollment status queries.
- Enhanced CSV import preloads existing placement/enrollment constraints in batched queries instead of issuing one D1 read per imported row.
- Migration remains additive and non-destructive.
- No runtime npm dependencies were added.

## Verification
- `npm run build`: PASS.
- Automated tests: 26 passed, 0 failed.
- All migrations were applied twice to a clean SQLite verification database without failure; final schema version remained 4.
- Production deploy safety check intentionally blocks until the real existing D1 name and UUID are configured.
