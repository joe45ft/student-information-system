-- Student IMS Next V1.4.0 Academic Network migration.
-- Non-destructive: adds Terms/Semesters, Course Offerings and real Enrollments.

CREATE TABLE IF NOT EXISTS academic_terms(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_offerings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  lecturer_id INTEGER,
  term_id INTEGER NOT NULL,
  batch_id INTEGER,
  group_id INTEGER,
  code TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY(lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,
  FOREIGN KEY(term_id) REFERENCES academic_terms(id) ON DELETE RESTRICT,
  FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  FOREIGN KEY(group_id) REFERENCES groups_tbl(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enrollments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  offering_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DROPPED','COMPLETED')),
  enrolled_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id,offering_id),
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_terms_status_dates ON academic_terms(status,start_date,end_date);
CREATE INDEX IF NOT EXISTS idx_offerings_term ON course_offerings(term_id,status);
CREATE INDEX IF NOT EXISTS idx_offerings_subject ON course_offerings(subject_id,status);
CREATE INDEX IF NOT EXISTS idx_offerings_lecturer ON course_offerings(lecturer_id,status);
CREATE INDEX IF NOT EXISTS idx_offerings_batch_group ON course_offerings(batch_id,group_id,status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id,status);
CREATE INDEX IF NOT EXISTS idx_enrollments_offering ON enrollments(offering_id,status);

UPDATE app_meta SET value='3' WHERE key='schema_version';
