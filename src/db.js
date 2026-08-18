import { createClient } from "@tursodatabase/serverless/compat";

export function dbFor(env) {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  }
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}
export async function all(db, sql, args = []) { const r=await db.execute({sql,args}); return r.rows.map(x=>({...x})); }
export async function one(db, sql, args = []) { const r=await db.execute({sql,args}); return r.rows.length?{...r.rows[0]}:null; }
export async function run(db, sql, args = []) { const r=await db.execute({sql,args}); return {changes:Number(r.rowsAffected||0),lastInsertRowid:r.lastInsertRowid==null?null:Number(r.lastInsertRowid)}; }
export async function batch(db, statements) { return db.batch(statements.map(x=>typeof x==="string"?x:{sql:x.sql,args:x.args||[]}),"write"); }

const perms=[
["dashboard.view","View Dashboard","Dashboard",10],
["students.view","View Students","Students",20],["students.create","Create Students","Students",21],["students.edit","Edit Students","Students",22],["students.delete","Delete Students","Students",23],["students.search","Search Students","Students",24],["students.export","Export Students","Students",25],["students.import","Import Students","Students",26],["students.print","Print Student Information","Students",27],
["batches.view","View Batches","Batches",30],["batches.create","Create Batches","Batches",31],["batches.edit","Edit Batches","Batches",32],["batches.delete","Delete Batches","Batches",33],
["lecturers.view","View Lecturers","Lecturers",40],["lecturers.create","Create Lecturers","Lecturers",41],["lecturers.edit","Edit Lecturers","Lecturers",42],["lecturers.delete","Delete Lecturers","Lecturers",43],
["subjects.view","View Subjects","Subjects",50],["subjects.create","Create Subjects","Subjects",51],["subjects.edit","Edit Subjects","Subjects",52],["subjects.delete","Delete Subjects","Subjects",53],
["groups.view","View Groups","Groups",60],["groups.create","Create Groups","Groups",61],["groups.edit","Edit Groups","Groups",62],["groups.delete","Delete Groups","Groups",63],["groups.move_students","Move Students Between Groups","Groups",64],
["reports.view","View Reports","Reports",70],["reports.export","Export Reports","Reports",71],["reports.print","Print Reports","Reports",72],
["users.view","View Users","Users",80],["users.create","Create Users","Users",81],["users.edit","Edit Users","Users",82],["users.disable","Disable Users","Users",83],["users.enable","Enable Users","Users",84],["users.change_role","Change Roles","Users",85],["users.change_permissions","Change Permissions","Users",86],["users.reset_password","Reset Password","Users",87],["users.revoke_sessions","Revoke Sessions","Users",88],
["activity_logs.view","View Activity Logs","System",90],["settings.view","View Settings","System",91],["settings.manage","Manage Settings","System",92],["organization.manage","Manage Organization Information","System",93],["security.view","View Security Activity","System",94]
];
const defaults={
 OWNER:perms.map(x=>x[0]),
 ADMIN:["dashboard.view","students.view","students.create","students.edit","students.delete","students.search","students.export","students.import","students.print","batches.view","batches.create","batches.edit","batches.delete","lecturers.view","lecturers.create","lecturers.edit","lecturers.delete","subjects.view","subjects.create","subjects.edit","subjects.delete","groups.view","groups.create","groups.edit","groups.delete","groups.move_students","reports.view","reports.export","reports.print"],
 DATA_ENTRY:["dashboard.view","students.view","students.create","students.edit","students.search","batches.view","lecturers.view","subjects.view","groups.view"],
 VIEWER:["dashboard.view","students.view","students.search","batches.view","lecturers.view","subjects.view","groups.view","reports.view"]
};
const schema=[
`CREATE TABLE IF NOT EXISTS organizations(id INTEGER PRIMARY KEY CHECK(id=1),name TEXT NOT NULL,short_name TEXT NOT NULL,email TEXT,phone TEXT,logo_url TEXT,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,phone TEXT,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','DATA_ENTRY','VIEWER')),status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED')),last_login_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,created_by INTEGER,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL)`,
`CREATE TABLE IF NOT EXISTS permissions(id INTEGER PRIMARY KEY AUTOINCREMENT,key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,category TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS role_permissions(role TEXT NOT NULL,permission_id INTEGER NOT NULL,PRIMARY KEY(role,permission_id),FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE)`,
`CREATE TABLE IF NOT EXISTS user_permissions(user_id INTEGER NOT NULL,permission_id INTEGER NOT NULL,allowed INTEGER NOT NULL CHECK(allowed IN (0,1)),PRIMARY KEY(user_id,permission_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE)`,
`CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,ip_address TEXT,user_agent TEXT,expires_at TEXT NOT NULL,last_activity_at TEXT NOT NULL,created_at TEXT NOT NULL,revoked_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`,
`CREATE TABLE IF NOT EXISTS password_reset_tokens(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`,
`CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT,ip_address TEXT,success INTEGER NOT NULL CHECK(success IN (0,1)),created_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email,ip_address,created_at)`,
`CREATE TABLE IF NOT EXISTS activity_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT NOT NULL,module TEXT NOT NULL,target_type TEXT,target_id TEXT,metadata TEXT,ip_address TEXT,user_agent TEXT,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL)`,
`CREATE TABLE IF NOT EXISTS batches(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,code TEXT UNIQUE COLLATE NOCASE,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS lecturers(id INTEGER PRIMARY KEY AUTOINCREMENT,full_name TEXT NOT NULL,email TEXT,phone TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,code TEXT UNIQUE COLLATE NOCASE,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS groups_table(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,code TEXT UNIQUE COLLATE NOCASE,batch_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL)`,
`CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY AUTOINCREMENT,student_code TEXT UNIQUE COLLATE NOCASE,full_name TEXT NOT NULL,email TEXT,phone TEXT,batch_id INTEGER,lecturer_id INTEGER,subject_id INTEGER,group_id INTEGER,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),notes TEXT,created_by INTEGER,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE SET NULL,FOREIGN KEY(lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL,FOREIGN KEY(group_id) REFERENCES groups_table(id) ON DELETE SET NULL,FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL)`
];
let initKey="",initPromise=null;
export async function ensureSchema(env){
  const key=`${env.TURSO_DATABASE_URL}|${env.TURSO_AUTH_TOKEN?.slice(-8)||""}`;
  if(initPromise&&initKey===key)return initPromise;

  initKey=key;
  initPromise=(async()=>{
    const db=dbFor(env);

    // Keep cold-start initialization well below Cloudflare Free's external
    // subrequest limit. We use a tiny metadata check and, only when needed,
    // seed the whole schema in one Turso batch request.
    await db.execute(`CREATE TABLE IF NOT EXISTS app_meta(
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    const ready=await one(db,"SELECT value FROM app_meta WHERE key='schema_version'");
    if(ready?.value==="1") return;

    const now=new Date().toISOString();
    const statements=[
      ...schema,
      {
        sql:`INSERT OR IGNORE INTO organizations(
          id,name,short_name,updated_at
        ) VALUES (1,'Student Information Management System','Student IMS',?)`,
        args:[now]
      }
    ];

    for(const [k,n,c,s] of perms){
      statements.push({
        sql:"INSERT OR IGNORE INTO permissions(key,name,category,sort_order) VALUES (?,?,?,?)",
        args:[k,n,c,s]
      });
    }

    for(const [role,keys] of Object.entries(defaults)){
      for(const k of keys){
        statements.push({
          sql:"INSERT OR IGNORE INTO role_permissions(role,permission_id) SELECT ?,id FROM permissions WHERE key=?",
          args:[role,k]
        });
      }
    }

    statements.push({
      sql:`INSERT INTO app_meta(key,value,updated_at)
           VALUES ('schema_version','1',?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
      args:[now]
    });

    await batch(db,statements);
  })();

  try{
    return await initPromise;
  }catch(error){
    // Allow a later request to retry after a transient initialization failure.
    initPromise=null;
    throw error;
  }
}

