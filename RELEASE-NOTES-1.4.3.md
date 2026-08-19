# Student IMS Next V1.4.3 — Automatic Codes

V1.4.3 adds server-side automatic code generation while preserving manual code overrides.

## Automatic codes
- Students: `STU-000001`
- Batches: `BAT-000001`
- Subjects: `SUB-000001`
- Terms / Semesters: `TRM-000001`
- Course Offerings: `OFF-000001`

Leave the code field blank when creating a record and the system generates a unique code after the database ID is assigned. Existing/manual codes remain unchanged. Clearing a code during edit regenerates the canonical automatic code for that record.

## Safety
- Generation is performed on the server, not trusted to the browser.
- The database record ID is used as the deterministic base, making normal generated codes stable and collision-resistant.
- A collision fallback suffix is added if a manually entered code already occupies the generated value.
- Student creation uses a temporary unique value only during the insert, then immediately replaces it with the final automatic code.
- No database schema migration is required.

CSV import still expects `student_code` because that field is the stable upsert key for imports and prevents accidental duplicate student creation.
