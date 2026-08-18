-- Student IMS Next V1.2.0 production baseline.
-- Idempotent by design: safe for both a fresh D1 database and an existing V1.1.0 database.

CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT NOT NULL,email TEXT NOT NULL COLLATE NOCASE UNIQUE,phone TEXT DEFAULT '',password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','DATA_ENTRY','VIEWER')),status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_login_at TEXT);
CREATE TABLE IF NOT EXISTS user_permissions(user_id INTEGER NOT NULL,permission TEXT NOT NULL,allowed INTEGER NOT NULL CHECK(allowed IN(0,1)),PRIMARY KEY(user_id,permission),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,user_agent TEXT DEFAULT '',revoked_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,fingerprint TEXT NOT NULL,success INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT NOT NULL,entity_type TEXT DEFAULT '',entity_id TEXT DEFAULT '',details TEXT DEFAULT '',created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,code TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS groups_tbl(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,batch_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS lecturers(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT NOT NULL,email TEXT DEFAULT '',phone TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,code TEXT DEFAULT '',lecturer_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,student_code TEXT NOT NULL UNIQUE,full_name TEXT NOT NULL,email TEXT DEFAULT '',phone TEXT DEFAULT '',gender TEXT DEFAULT '',birth_date TEXT DEFAULT '',batch_id INTEGER,group_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE',notes TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL,FOREIGN KEY(group_id) REFERENCES groups_tbl(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS password_reset_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,requested_email TEXT NOT NULL,requested_at TEXT NOT NULL,resolved_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);

INSERT OR IGNORE INTO app_meta(key,value) VALUES('schema_version','2');
UPDATE app_meta SET value='2' WHERE key='schema_version';
INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES('organization_name','Student Information System',CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES('support_email','',CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_students_name ON students(full_name);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email,fingerprint,created_at);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status,role);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id,revoked_at,expires_at);
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_logs(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_open ON password_reset_requests(user_id,resolved_at);
CREATE INDEX IF NOT EXISTS idx_login_attempt_email_time ON login_attempts(email,success,created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempt_fingerprint_time ON login_attempts(fingerprint,success,created_at);
