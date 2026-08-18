# Student IMS Next V1.2.0 — Production Hardening Release

V1.2.0 is an incremental production-quality update over V1.1.0. It preserves the existing Worker + D1 architecture, database tables, roles, permissions and core user flows while hardening security, reliability, performance and UI behavior.

## Highlights

- Centralized runtime configuration and server-side validation modules.
- PBKDF2 iteration hardening with automatic legacy-hash upgrade on login.
- Same-origin-aware CSRF protection and safer cookie parsing.
- Production security headers and safer user-facing error handling.
- Correct 405 handling and safe malformed route parameters.
- Explicit `sessions.manage` enforcement.
- Dedicated `reports.export` endpoint.
- Student, academic and activity pagination.
- Faster login-throttling indexes/queries and settings caching.
- Reduced student-form D1 requests and optimized user reset-request query.
- Versioned D1 production migration baseline.
- CSV import limits and stronger validation.
- Academic relationships exposed in existing subject/group UIs.
- Accessible focus states, skip navigation, mobile drawer ARIA, reduced motion and duplicate-submit protection.
- 18 automated tests plus an authenticated page-render smoke suite.

## Compatibility

- Existing table/column schema is retained.
- Existing V1.1.0 password hashes remain valid.
- Existing roles and 24 permission keys are retained.
- Existing student CSV export route is retained.
- Existing URLs remain functional; `/logout` additionally supports a safe GET confirmation page and `/reports/export.csv` is new.
