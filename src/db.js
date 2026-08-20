import { nowIso } from "./utils.js";

export const PERMISSIONS = [
  ["dashboard.view", "Dashboard"],
  ["students.view", "View students"],
  ["students.create", "Create students"],
  ["students.edit", "Edit students"],
  ["students.delete", "Delete students"],
  ["students.import", "Import students"],
  ["students.export", "Export students"],
  ["batches.view", "View batches"],
  ["batches.manage", "Manage batches"],
  ["lecturers.view", "View lecturers"],
  ["lecturers.manage", "Manage lecturers"],
  ["subjects.view", "View subjects"],
  ["subjects.manage", "Manage subjects"],
  ["groups.view", "View groups"],
  ["groups.manage", "Manage groups"],
  ["terms.view", "View terms / semesters"],
  ["terms.manage", "Manage terms / semesters"],
  ["offerings.view", "View course offerings"],
  ["offerings.manage", "Manage course offerings"],
  ["enrollments.view", "View enrollments"],
  ["enrollments.manage", "Manage enrollments"],
  ["users.view", "View users"],
  ["users.manage", "Manage users & permissions"],
  ["users.reset_password", "Reset passwords"],
  ["reports.view", "View reports"],
  ["reports.export", "Export reports"],
  ["activity.view", "View activity log"],
  ["settings.view", "View settings"],
  ["settings.manage", "Manage settings"],
  ["sessions.manage", "Manage own sessions"]
];

export const ROLE_DEFAULTS = {
  OWNER: PERMISSIONS.map(([permission]) => permission),
  ADMIN: PERMISSIONS.map(([permission]) => permission).filter(permission => permission !== "settings.manage"),
  DATA_ENTRY: [
    "dashboard.view", "students.view", "students.create", "students.edit", "students.import", "students.export",
    "batches.view", "lecturers.view", "subjects.view", "groups.view", "terms.view", "offerings.view", "enrollments.view",
    "reports.view", "sessions.manage"
  ],
  VIEWER: [
    "dashboard.view", "students.view", "batches.view", "lecturers.view", "subjects.view", "groups.view",
    "terms.view", "offerings.view", "enrollments.view", "reports.view", "sessions.manage"
  ]
};

const SCHEMA_VERSION = 4;
const schemaReady = new WeakSet();
const settingsCache = new WeakMap();

const TABLE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT NOT NULL,email TEXT NOT NULL COLLATE NOCASE UNIQUE,phone TEXT DEFAULT '',password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','DATA_ENTRY','VIEWER')),status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_login_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS user_permissions(user_id INTEGER NOT NULL,permission TEXT NOT NULL,allowed INTEGER NOT NULL CHECK(allowed IN(0,1)),PRIMARY KEY(user_id,permission),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,user_agent TEXT DEFAULT '',revoked_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,fingerprint TEXT NOT NULL,success INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS activity_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT NOT NULL,entity_type TEXT DEFAULT '',entity_id TEXT DEFAULT '',details TEXT DEFAULT '',created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,code TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS groups_tbl(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,batch_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS lecturers(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT NOT NULL,email TEXT DEFAULT '',phone TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,code TEXT DEFAULT '',lecturer_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS academic_terms(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,code TEXT DEFAULT '',start_date TEXT DEFAULT '',end_date TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS course_offerings(id INTEGER PRIMARY KEY AUTOINCREMENT,subject_id INTEGER NOT NULL,lecturer_id INTEGER,term_id INTEGER NOT NULL,batch_id INTEGER,group_id INTEGER,code TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,FOREIGN KEY(lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,FOREIGN KEY(term_id) REFERENCES academic_terms(id) ON DELETE RESTRICT,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL,FOREIGN KEY(group_id) REFERENCES groups_tbl(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,student_code TEXT NOT NULL UNIQUE,full_name TEXT NOT NULL,email TEXT DEFAULT '',phone TEXT DEFAULT '',gender TEXT DEFAULT '',birth_date TEXT DEFAULT '',batch_id INTEGER,group_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE',notes TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL,FOREIGN KEY(group_id) REFERENCES groups_tbl(id) ON DELETE SET NULL)`,
  `CREATE TABLE IF NOT EXISTS enrollments(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id INTEGER NOT NULL,offering_id INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DROPPED','COMPLETED')),enrolled_at TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(student_id,offering_id),FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,FOREIGN KEY(offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS password_reset_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,requested_email TEXT NOT NULL,requested_at TEXT NOT NULL,resolved_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL)`
];

const BASE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_students_name ON students(full_name)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email,fingerprint,created_at)`
];

const V2_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)`,
  `CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status,role)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id,revoked_at,expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_logs(user_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_open ON password_reset_requests(user_id,resolved_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempt_email_time ON login_attempts(email,success,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempt_fingerprint_time ON login_attempts(fingerprint,success,created_at)`
];
const V3_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_terms_status_dates ON academic_terms(status,start_date,end_date)`,
  `CREATE INDEX IF NOT EXISTS idx_offerings_term ON course_offerings(term_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_offerings_subject ON course_offerings(subject_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_offerings_lecturer ON course_offerings(lecturer_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_offerings_batch_group ON course_offerings(batch_id,group_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollments_offering ON enrollments(offering_id,status)`
];
const V4_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_batches_status_name ON batches(status,name)`,
  `CREATE INDEX IF NOT EXISTS idx_groups_batch_status_name ON groups_tbl(batch_id,status,name)`,
  `CREATE INDEX IF NOT EXISTS idx_lecturers_status_name ON lecturers(status,full_name)`,
  `CREATE INDEX IF NOT EXISTS idx_subjects_lecturer_status_name ON subjects(lecturer_id,status,name)`,
  `CREATE INDEX IF NOT EXISTS idx_offerings_status_code ON course_offerings(status,code)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollments_status_updated ON enrollments(status,updated_at)`
];
const EXPECTED_TABLES = [
  "app_meta", "settings", "users", "user_permissions", "sessions", "login_attempts", "activity_logs",
  "batches", "groups_tbl", "lecturers", "subjects", "academic_terms", "course_offerings", "students", "enrollments", "password_reset_requests"
];
const EXPECTED_INDEXES = [...BASE_INDEXES, ...V2_INDEXES, ...V3_INDEXES, ...V4_INDEXES].map(sql => sql.match(/INDEX IF NOT EXISTS\s+([a-z0-9_]+)/i)?.[1]).filter(Boolean);

export async function ensureSchema(db) {
  if (!db) throw new Error("D1 binding DB is not configured.");
  if (schemaReady.has(db)) return;

  // Fast path for normal production requests: verify metadata instead of replaying DDL on every cold isolate.
  try {
    const tableMarks = EXPECTED_TABLES.map(() => "?").join(",");
    const indexMarks = EXPECTED_INDEXES.map(() => "?").join(",");
    const checks = await db.batch([
      db.prepare("SELECT value FROM app_meta WHERE key='schema_version'"),
      db.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name IN (${tableMarks})`).bind(...EXPECTED_TABLES),
      db.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE type='index' AND name IN (${indexMarks})`).bind(...EXPECTED_INDEXES)
    ]);
    const version = Number.parseInt(String(checks[0]?.results?.[0]?.value || "0"), 10) || 0;
    const tableCount = Number(checks[1]?.results?.[0]?.n || 0);
    const indexCount = Number(checks[2]?.results?.[0]?.n || 0);
    if (version >= SCHEMA_VERSION && tableCount === EXPECTED_TABLES.length && indexCount === EXPECTED_INDEXES.length) {
      schemaReady.add(db);
      return;
    }
  } catch {
    // First deployment or partial schema: fall through to the idempotent repair/migration path.
  }

  await db.batch([...TABLE_SCHEMA, ...BASE_INDEXES].map(sql => db.prepare(sql)));

  const ts = nowIso();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO app_meta(key,value) VALUES('schema_version','1')"),
    db.prepare("INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES('organization_name','Student Information System',?)").bind(ts),
    db.prepare("INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES('support_email','',?)").bind(ts)
  ]);

  const versionRow = await db.prepare("SELECT value FROM app_meta WHERE key='schema_version'").first();
  const currentVersion = Number.parseInt(String(versionRow?.value || "1"), 10) || 1;
  // CREATE INDEX IF NOT EXISTS keeps both upgrades and manual repairs idempotent.
  await db.batch([...V2_INDEXES, ...V3_INDEXES, ...V4_INDEXES].map(sql => db.prepare(sql)));
  if (currentVersion < SCHEMA_VERSION) {
    await db.prepare("UPDATE app_meta SET value=? WHERE key='schema_version'").bind(String(SCHEMA_VERSION)).run();
  }

  schemaReady.add(db);
}

export async function getSettings(db) {
  const cached = settingsCache.get(db);
  if (cached && Date.now() - cached.at < 30000) return cached.value;
  const rows = (await db.prepare("SELECT key,value FROM settings").all()).results || [];
  const value = Object.fromEntries(rows.map(row => [row.key, row.value]));
  settingsCache.set(db, { at: Date.now(), value });
  return value;
}

export function invalidateSettingsCache(db) {
  settingsCache.delete(db);
}

export function defaultPermissions(role) {
  return new Set(ROLE_DEFAULTS[role] || []);
}

export async function hydratePermissions(db, user) {
  if (!user) return null;
  if (user.role === "OWNER") return { ...user, permissions: new Set(PERMISSIONS.map(([permission]) => permission)) };
  const set = defaultPermissions(user.role);
  const rows = (await db.prepare("SELECT permission,allowed FROM user_permissions WHERE user_id=?").bind(user.id).all()).results || [];
  for (const row of rows) row.allowed ? set.add(row.permission) : set.delete(row.permission);
  return { ...user, permissions: set };
}

export function can(user, permission) {
  return Boolean(user) && (user.role === "OWNER" || user.permissions?.has(permission));
}

export async function audit(db, userId, action, entityType = "", entityId = "", details = "") {
  await db.prepare("INSERT INTO activity_logs(user_id,action,entity_type,entity_id,details,created_at) VALUES(?,?,?,?,?,?)")
    .bind(userId || null, action, entityType, String(entityId || ""), String(details || "").slice(0, 1000), nowIso())
    .run();
}

export async function pruneOperationalData(db) {
  const now = Date.now();
  const loginCutoff = new Date(now - 7 * 86400000).toISOString();
  const historyCutoff = new Date(now - 90 * 86400000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM login_attempts WHERE created_at < ?").bind(loginCutoff),
    db.prepare("DELETE FROM sessions WHERE (expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?))").bind(historyCutoff, historyCutoff),
    db.prepare("DELETE FROM password_reset_requests WHERE resolved_at IS NOT NULL AND resolved_at < ?").bind(historyCutoff)
  ]);
}


export async function getResetDataCounts(db, ownerId = 0, currentSessionId = 0) {
  const specs = [
    ["Students", "students", "SELECT COUNT(*) n FROM students"],
    ["Enrollments", "enrollments", "SELECT COUNT(*) n FROM enrollments"],
    ["Course Offerings", "course_offerings", "SELECT COUNT(*) n FROM course_offerings"],
    ["Terms / Semesters", "academic_terms", "SELECT COUNT(*) n FROM academic_terms"],
    ["Subjects", "subjects", "SELECT COUNT(*) n FROM subjects"],
    ["Lecturers", "lecturers", "SELECT COUNT(*) n FROM lecturers"],
    ["Groups", "groups_tbl", "SELECT COUNT(*) n FROM groups_tbl"],
    ["Batches", "batches", "SELECT COUNT(*) n FROM batches"],
    ["Other Users", "users", "SELECT COUNT(*) n FROM users WHERE id<>?", ownerId],
    ["Other Sessions", "sessions", "SELECT COUNT(*) n FROM sessions WHERE id<>?", currentSessionId],
    ["Permission Overrides", "user_permissions", "SELECT COUNT(*) n FROM user_permissions"],
    ["Activity Logs", "activity_logs", "SELECT COUNT(*) n FROM activity_logs"],
    ["Login Attempts", "login_attempts", "SELECT COUNT(*) n FROM login_attempts"],
    ["Password Reset Requests", "password_reset_requests", "SELECT COUNT(*) n FROM password_reset_requests"],
    ["Organization Settings", "settings", "SELECT COUNT(*) n FROM settings"]
  ];
  const rows = await db.batch(specs.map(([, , sql, bind]) => bind ? db.prepare(sql).bind(bind) : db.prepare(sql)));
  return specs.map(([label, table], i) => ({ label, table, count: Number(rows[i]?.results?.[0]?.n || 0) }));
}

export async function resetAllDataKeepOwner(db, ownerId, currentSessionId) {
  // Reset every application data area while preserving exactly the currently authenticated Owner account
  // and its current session. This keeps the system usable immediately after the reset without returning to /setup.
  if (!Number(ownerId) || !Number(currentSessionId)) throw new Error("Owner and current session are required for keep-owner reset");
  const ts = nowIso();
  await db.batch([
    db.prepare("DELETE FROM enrollments"),
    db.prepare("DELETE FROM course_offerings"),
    db.prepare("DELETE FROM students"),
    db.prepare("DELETE FROM subjects"),
    db.prepare("DELETE FROM lecturers"),
    db.prepare("DELETE FROM groups_tbl"),
    db.prepare("DELETE FROM batches"),
    db.prepare("DELETE FROM academic_terms"),
    db.prepare("DELETE FROM password_reset_requests"),
    db.prepare("DELETE FROM user_permissions"),
    db.prepare("DELETE FROM activity_logs"),
    db.prepare("DELETE FROM login_attempts"),
    db.prepare("DELETE FROM sessions WHERE id<>?").bind(currentSessionId),
    db.prepare("DELETE FROM users WHERE id<>?").bind(ownerId),
    db.prepare("DELETE FROM settings"),
    db.prepare("INSERT INTO settings(key,value,updated_at) VALUES('organization_name','Student Information System',?)").bind(ts),
    db.prepare("INSERT INTO settings(key,value,updated_at) VALUES('support_email','',?)").bind(ts)
  ]);
  try {
    await db.prepare(`DELETE FROM sqlite_sequence WHERE name IN ('login_attempts','activity_logs','batches','groups_tbl','lecturers','subjects','academic_terms','course_offerings','students','enrollments','password_reset_requests')`).run();
  } catch {
    // Sequence reset is cosmetic only; never fail a completed data reset because of it.
  }
  settingsCache.delete(db);
}

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;
