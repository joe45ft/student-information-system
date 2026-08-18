# Student IMS Next V1.3.0 — Student Experience

V1.3.0 builds on V1.2.2 Auto Refresh and focuses on the student-facing administration experience without changing the database schema or removing existing functionality.

## Added

- Dedicated Student Profile route: `/students/:id`.
- Permission-aware profile actions for Edit and Delete.
- Advanced student filters: text search, status, gender, batch, group, created-date range and sorting.
- Exact matching-result count and clearer empty state.
- Upgraded dashboard cards with direct navigation.
- Academic placement coverage indicators.
- Student distribution summaries by batch and gender.
- Data-quality overview for missing batch/group assignments.
- Responsive profile, dashboard and filter layouts.

## Compatibility

- No D1 schema change. Schema version remains 2.
- No new runtime npm dependencies.
- Existing authentication, authorization, sessions, CSRF, PBKDF2 compatibility and Auto Refresh remain unchanged.
- Existing student CRUD/import/export routes remain supported.
