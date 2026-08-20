# Student IMS Next V1.4.6

## Custom Delete

- Adds a dedicated dependency-aware Custom Delete center for Students, Batches, Groups, Lecturers, Subjects, Terms/Semesters, and Course Offerings.
- Shows related-data counts and active blockers before any destructive action.
- Supports safe Deactivate/Close as the recommended alternative.
- Permanent deletion is available only when no related records exist.
- Permanent deletion requires an exact code/name confirmation, explicit acknowledgement, and an audit reason.
- Custom Delete never force-cascades through academic history.
- Every custom delete action is recorded in Activity Log.

No database migration or runtime dependency changes are required. Schema remains V4.
