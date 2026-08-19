# Student IMS Next V1.3.4 — Connected Academic UI

V1.3.4 connects the existing academic records without changing the D1 schema.

## Added
- Dedicated Batch Profile with connected Groups and Students.
- Dedicated Group Profile with parent Batch and assigned Students.
- Dedicated Subject Profile with assigned Lecturer and the future Enrollment path.
- Clickable academic relationships from Student Profile and Students table.
- Clickable Batch, Group, Subject and Lecturer relations in academic tables.
- Batch-filtered Groups view (`/groups?batch=...`).
- Breadcrumbs and relationship flows across academic profile pages.
- Related record counts in Batches and Groups listings.

## Relationship model
The UI now follows the existing safe relationships:

`Batch → Group → Student`

and

`Lecturer → Subject → Enrollment → Student`

Enrollment is intentionally displayed as a future V1.4.0 stage. No fake Subject-to-Student or Lecturer-to-Student data is created.

## Compatibility
- No D1 schema changes.
- No migration required.
- No new runtime dependency.
- Existing routes, permissions, Auto Refresh, Student Experience, Users & Permissions, and Lecturer Connections remain intact.

## Security note
Related-record panels and links are permission-aware. For example, a user with `batches.view` but without `groups.view` or `students.view` can open the Batch profile without seeing restricted Group or Student records.
