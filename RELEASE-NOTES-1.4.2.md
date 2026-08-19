# Student IMS Next V1.4.2 — Safe Actions & Complete Controls

V1.4.2 adds the missing record lifecycle controls without changing the D1 schema.

## Added
- Explicit Activate / Deactivate controls for Batches, Groups, Lecturers and Subjects.
- Explicit Close / Reopen controls for Terms and Course Offerings.
- Safe permanent Delete for inactive academic records only when no related data exists.
- Duplicate Course Offering workflow that pre-fills a new inactive offering and clears the offering code.
- Permanent removal of a mistaken Enrollment only after it has been marked DROPPED.
- Enable / Disable User quick action with session revocation on disable.
- Dismiss pending Password Reset Requests without changing the password.
- Stronger dependency checks before deactivating academic records.
- Student Activate / Deactivate quick actions with protection against deactivating students who still have ACTIVE enrollments.
- Bulk Activate / Deactivate for Students, Batches, Groups, Lecturers and Subjects (up to 100 selected records per request); unsafe records are skipped by the same server-side dependency checks.
- Select-all controls for the current page and confirmation before bulk changes.

## Data safety rules
Permanent deletion is intentionally conservative. Related Students, Groups, Offerings, Enrollments or historical academic records block deletion. Records must be deactivated/closed first.

## Database
No schema migration is required. Schema remains v4.

- Student permanent deletion now preserves academic history: any enrollment history blocks permanent deletion; deactivate the student instead.
