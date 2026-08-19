# Student IMS Next V1.3.3 — Lecturer Connections

V1.3.3 connects the Lecturer experience to the academic structure without changing the D1 schema.

## Added
- Dedicated `/lecturers/:id` profile page.
- Lecturer contact details including the already-existing phone field.
- Assigned subject counts and subject list on each lecturer profile.
- Clickable lecturer references from Subjects.
- Subject filtering with `?lecturer=<id>`.
- Visual relationship flow: Lecturer → Subjects → Enrollment → Students.

## Design decision
A direct Lecturer → Student foreign key was intentionally not added. V1.4.0 will introduce Enrollment, allowing students to be connected correctly through subjects. This keeps future Attendance and Grades relationships consistent.

## Compatibility
- No D1 schema change.
- No migration required.
- No runtime dependencies added.
- Existing routes and permissions remain compatible.
