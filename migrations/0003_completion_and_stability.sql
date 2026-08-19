-- Student IMS Next V1.4.1 completion and stability indexes.
-- Additive and non-destructive.

CREATE INDEX IF NOT EXISTS idx_batches_status_name ON batches(status,name);
CREATE INDEX IF NOT EXISTS idx_groups_batch_status_name ON groups_tbl(batch_id,status,name);
CREATE INDEX IF NOT EXISTS idx_lecturers_status_name ON lecturers(status,full_name);
CREATE INDEX IF NOT EXISTS idx_subjects_lecturer_status_name ON subjects(lecturer_id,status,name);
CREATE INDEX IF NOT EXISTS idx_offerings_status_code ON course_offerings(status,code);
CREATE INDEX IF NOT EXISTS idx_enrollments_status_updated ON enrollments(status,updated_at);

UPDATE app_meta SET value='4' WHERE key='schema_version';
