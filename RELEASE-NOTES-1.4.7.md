# Student IMS Next V1.4.7

## Global Delete All Data / Factory Reset

- Adds an Owner-only **Delete All Data / Factory Reset** control under Settings > Danger Zone.
- Requires the current Owner password, the exact confirmation phrase `DELETE ALL DATA`, a final acknowledgement checkbox, and a browser confirmation.
- Shows live record counts before deletion.
- Deletes all application data: students, enrollments, offerings, terms, subjects, lecturers, groups, batches, users, sessions, permission overrides, activity logs, login attempts, reset requests, and organization settings.
- Preserves database tables, indexes, and `schema_version` so the same D1 database remains deployable.
- Restores default organization settings and redirects to First System Setup after completion.
- Resets AUTOINCREMENT sequences when supported.
- Owner-only on both UI and server route.

No schema migration is required; schema remains v4.
