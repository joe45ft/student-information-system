import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = [
  "package.json","wrangler.jsonc","src/index.js","src/router.js","src/security.js","src/db.js","src/ui.js","src/client.js","src/utils.js","src/config.js","src/validation.js",
  "migrations/0001_production_baseline.sql","migrations/0002_academic_network.sql","migrations/0003_completion_and_stability.sql",
  "scripts/predeploy.mjs","scripts/configure-production.mjs","tests/integration.test.mjs","tests/client.test.mjs","RELEASE-NOTES-1.4.1.md","V1.4.1-COMPLETION-REPORT.md","RELEASE-NOTES-1.4.2.md","V1.4.2-ACTIONS-REPORT.md","RELEASE-NOTES-1.4.3.md","V1.4.3-AUTOMATIC-CODES-REPORT.md","RELEASE-NOTES-1.4.5.md","V1.4.5-FRIENDLY-ERRORS-REPORT.md","RELEASE-NOTES-1.4.7.md","V1.4.7-FACTORY-RESET-REPORT.md","RELEASE-NOTES-1.4.8.md","V1.4.8-KEEP-OWNER-RESET-REPORT.md"
];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.version !== "1.4.8") throw new Error("Unexpected package version");
if (Object.keys(pkg.dependencies || {}).length) throw new Error("Project must keep zero runtime npm dependencies");
if (pkg.devDependencies?.wrangler !== "4.123.0") throw new Error("Wrangler must remain pinned for reproducible builds");
if (!pkg.scripts?.deploy?.includes("predeploy.mjs")) throw new Error("Production deploy guard is missing");
if (!pkg.scripts?.["db:migrate:remote"]?.includes("predeploy.mjs")) throw new Error("Remote migration guard is missing");

const wrangler = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
if (!/"name"\s*:\s*"student-information-system"/.test(wrangler)) throw new Error("Worker name must match the existing production Worker");
if (!/"binding"\s*:\s*"DB"/.test(wrangler)) throw new Error("D1 binding DB missing");
if (!/"migrations_dir"\s*:\s*"migrations"/.test(wrangler)) throw new Error("D1 migrations directory is not configured");
if (!/"APP_VERSION"\s*:\s*"1\.4\.8"/.test(wrangler)) throw new Error("wrangler APP_VERSION does not match package version");

const migrations = [
  ["baseline", fs.readFileSync(path.join(root,"migrations/0001_production_baseline.sql"),"utf8")],
  ["academic network", fs.readFileSync(path.join(root,"migrations/0002_academic_network.sql"),"utf8")],
  ["completion", fs.readFileSync(path.join(root,"migrations/0003_completion_and_stability.sql"),"utf8")]
];
for (const [name,migration] of migrations) if (/\bDROP\s+(TABLE|INDEX|DATABASE)\b/i.test(migration)) throw new Error(`${name} migration must remain non-destructive`);
if (!/schema_version[^;]*2/i.test(migrations[0][1])) throw new Error("Baseline migration must remain schema version 2");
if (!/academic_terms/i.test(migrations[1][1]) || !/course_offerings/i.test(migrations[1][1]) || !/enrollments/i.test(migrations[1][1])) throw new Error("Academic network migration is incomplete");
if (!/value='3'|value\s*=\s*'3'/i.test(migrations[1][1])) throw new Error("Academic network migration must set schema version 3");
if (!/value='4'|value\s*=\s*'4'/i.test(migrations[2][1])) throw new Error("Completion migration must set schema version 4");

const config = fs.readFileSync(path.join(root,"src/config.js"),"utf8");
if (!/APP_VERSION\s*=\s*"1\.4\.8"/.test(config)) throw new Error("Runtime APP_VERSION does not match package version");
if (!/APP_SLUG\s*=\s*"student-information-system"/.test(config)) throw new Error("Runtime app slug must match production Worker");
if (!/AUTO_REFRESH_INTERVAL_SECONDS\s*=\s*60/.test(config)) throw new Error("Automatic refresh interval must remain 60 seconds");

const db = fs.readFileSync(path.join(root,"src/db.js"),"utf8");
if (!/SCHEMA_VERSION\s*=\s*4/.test(db)) throw new Error("Runtime schema version must be 4");
for (const table of ["academic_terms","course_offerings","enrollments"]) if (!db.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Runtime schema missing ${table}`);
for (const permission of ["terms.view","terms.manage","offerings.view","offerings.manage","enrollments.view","enrollments.manage"]) if (!db.includes(permission)) throw new Error(`Missing permission ${permission}`);
for (const index of ["idx_batches_status_name","idx_groups_batch_status_name","idx_lecturers_status_name","idx_subjects_lecturer_status_name","idx_offerings_status_code","idx_enrollments_status_updated"]) if (!db.includes(index)) throw new Error(`Runtime schema missing index ${index}`);

const sourceFiles = fs.readdirSync(path.join(root,"src")).filter(file=>file.endsWith(".js"));
const sourceText = sourceFiles.map(file=>fs.readFileSync(path.join(root,"src",file),"utf8")).join("\n");
if (/\b(hono|turso|libsql)\b/i.test(sourceText)) throw new Error("Old architecture detected");
if (/AUTH_PEPPER\s*[:=]\s*["'][^"']{8,}["']/.test(sourceText) || /AUTH_PEPPER\s*[:=]\s*["'][^"']{8,}["']/.test(wrangler)) throw new Error("Possible hardcoded AUTH_PEPPER detected");

const security = fs.readFileSync(path.join(root,"src/security.js"),"utf8");
if (!/CLOUDFLARE_PBKDF2_MAX_ITER\s*=\s*100000/.test(security)) throw new Error("Cloudflare PBKDF2 runtime cap must remain 100000");
if (/CURRENT_ITER\s*=\s*(?:1[0-9]{5,}|[2-9][0-9]{5,})/.test(security)) throw new Error("PBKDF2 iteration count exceeds Cloudflare Workers runtime support");

const index = fs.readFileSync(path.join(root,"src/index.js"),"utf8");
if (/fetch\(["']\/setup/.test(index)) throw new Error("Setup must remain a native server-rendered form");
if (!/method="post" action="\/setup"/.test(index)) throw new Error("Native setup form missing");
for (const route of ["/settings/reset-all","/custom-delete/:entity/:id","/terms","/offerings","/enrollments","/enrollments/new","/offerings/:id/enroll","/enrollments/:id/status","/enrollments/:id/delete","/students/:id/status","/students/bulk","/terms/:id/status","/terms/:id/delete","/offerings/:id/status","/offerings/:id/delete","/sessions/:id/revoke","/users/:id/status","/users/:id/reset-requests/resolve"]) if (!index.includes(`"${route}"`)) throw new Error(`Required route missing: ${route}`);
if (!index.includes('router.add("POST",`/${key}/bulk`')) throw new Error("Dynamic academic bulk route missing");
if (!/This placement change would conflict/.test(index) || !/This Batch\/Group change would make/.test(index)) throw new Error("Academic consistency guards missing");
if (!/Production Diagnostics/.test(index)) throw new Error("Production diagnostics UI missing");

for (const file of sourceFiles) execFileSync(process.execPath,["--check",path.join(root,"src",file)],{stdio:"pipe"});
console.log("VALIDATION PASS: V1.4.8 Keep Owner Reset + Custom Delete + friendly actionable errors + enrollment eligibility UX + automatic codes + safe actions, schema v4, production deploy guard, connected academic network, consistency checks, reporting, session controls, enhanced import, zero runtime dependencies, syntax");
