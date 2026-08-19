# Student IMS Next V1.4.0 — Academic Network

V1.4.0 turns the previously separated academic records into one connected model without removing the existing Batch, Group, Lecturer, Subject or Student data.

## Added

- Terms / Semesters with optional code, start/end dates and status.
- Course Offerings as the central teaching entity connecting:
  - Subject
  - Lecturer
  - Term / Semester
  - Batch
  - Group
- Real Student Enrollment records linked to Course Offerings.
- Enrollment statuses: ACTIVE, DROPPED and COMPLETED.
- Course Offering profile with academic-network visualization, roster and eligibility-aware enrollment form.
- Term profile with all course offerings in the period.
- Enrollment directory with filters and status management.
- Student profiles now show real enrolled subjects, term, lecturer and cohort.
- Lecturer profiles now show their actual teaching schedule rather than a direct Lecturer → Student assumption.
- Subject profiles show all real course offerings by term, lecturer and cohort.
- Batch and Group profiles now expose their connected course offerings.
- New server-side permissions for terms, offerings and enrollments.
- Automatic refresh support for the three new read-oriented list pages.

## Database

Schema version is now **3**.

New tables:
- `academic_terms`
- `course_offerings`
- `enrollments`

New migration:
- `migrations/0002_academic_network.sql`

The migration is non-destructive and does not delete or rewrite existing Student, Batch, Group, Lecturer or Subject records.

## Compatibility

- Existing `subjects.lecturer_id` is preserved as the subject's default/preferred lecturer for backward compatibility.
- The actual lecturer teaching a class is now stored on `course_offerings.lecturer_id`.
- Existing Student `batch_id` and `group_id` remain the placement source used to validate enrollment eligibility.
- No runtime npm dependency was added.
- Cloudflare PBKDF2 remains capped at 100,000 iterations.

## Deployment

For an existing production D1 database:

```bash
npm run build
npm run db:migrate:remote
npm run deploy
```

Do not reset or delete the current D1 database.
