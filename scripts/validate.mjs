import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = [
  "package.json",
  "wrangler.jsonc",
  "src/index.js",
  "src/router.js",
  "src/security.js",
  "src/db.js",
  "src/ui.js",
  "src/client.js",
  "src/utils.js",
  "src/config.js",
  "src/validation.js",
  "migrations/0001_production_baseline.sql",
  "migrations/0002_academic_network.sql",
  "tests/integration.test.mjs",
  "tests/client.test.mjs",
  "RELEASE-NOTES-1.3.4.md",
  "V1.3.4-IMPLEMENTATION-SUMMARY.md",
  "RELEASE-NOTES-1.4.0.md",
  "V1.4.0-IMPLEMENTATION-SUMMARY.md"
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.version !== "1.4.0") throw new Error("Unexpected package version");
if (Object.keys(pkg.dependencies || {}).length) throw new Error("Project must keep zero runtime npm dependencies");
if (pkg.devDependencies?.wrangler !== "4.123.0") throw new Error("Wrangler must remain pinned for reproducible builds");

const wrangler = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
if (!/"binding"\s*:\s*"DB"/.test(wrangler)) throw new Error("D1 binding DB missing");
if (!/"migrations_dir"\s*:\s*"migrations"/.test(wrangler)) throw new Error("D1 migrations directory is not configured");
if (!/"APP_VERSION"\s*:\s*"1\.4\.0"/.test(wrangler)) throw new Error("wrangler APP_VERSION does not match package version");

const baseline = fs.readFileSync(path.join(root, "migrations/0001_production_baseline.sql"), "utf8");
const academicMigration = fs.readFileSync(path.join(root, "migrations/0002_academic_network.sql"), "utf8");
for (const [name, migration] of [["baseline", baseline],["academic network", academicMigration]]) {
  if (/\bDROP\s+(TABLE|INDEX|DATABASE)\b/i.test(migration)) throw new Error(`${name} migration must remain non-destructive`);
}
if (!/schema_version[^;]*2/i.test(baseline)) throw new Error("Baseline migration must remain schema version 2");
if (!/academic_terms/i.test(academicMigration) || !/course_offerings/i.test(academicMigration) || !/enrollments/i.test(academicMigration)) throw new Error("Academic network migration is incomplete");
if (!/value='3'|value\s*=\s*'3'/i.test(academicMigration)) throw new Error("Academic network migration must set schema version 3");

const config = fs.readFileSync(path.join(root, "src/config.js"), "utf8");
if (!/APP_VERSION\s*=\s*"1\.4\.0"/.test(config)) throw new Error("Runtime APP_VERSION does not match package version");
if (!/AUTO_REFRESH_INTERVAL_SECONDS\s*=\s*60/.test(config)) throw new Error("Automatic refresh interval must remain 60 seconds");
if (!/ENROLLMENT_STATUSES\s*=\s*\["ACTIVE",\s*"DROPPED",\s*"COMPLETED"\]/.test(config)) throw new Error("Enrollment status allowlist missing");

const db = fs.readFileSync(path.join(root, "src/db.js"), "utf8");
if (!/SCHEMA_VERSION\s*=\s*3/.test(db)) throw new Error("Runtime schema version must be 3");
for (const table of ["academic_terms","course_offerings","enrollments"]) if (!db.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Runtime schema missing ${table}`);
for (const permission of ["terms.view","terms.manage","offerings.view","offerings.manage","enrollments.view","enrollments.manage"]) if (!db.includes(permission)) throw new Error(`Missing permission ${permission}`);

const sourceFiles = fs.readdirSync(path.join(root, "src")).filter(file => file.endsWith(".js"));
const sourceText = sourceFiles.map(file => fs.readFileSync(path.join(root, "src", file), "utf8")).join("\n");
if (/\b(hono|turso|libsql)\b/i.test(sourceText)) throw new Error("Old architecture detected");
if (/AUTH_PEPPER\s*[:=]\s*["'][^"']{8,}["']/.test(sourceText) || /AUTH_PEPPER\s*[:=]\s*["'][^"']{8,}["']/.test(wrangler)) throw new Error("Possible hardcoded AUTH_PEPPER detected");

const security = fs.readFileSync(path.join(root, "src/security.js"), "utf8");
if (!/CLOUDFLARE_PBKDF2_MAX_ITER\s*=\s*100000/.test(security)) throw new Error("Cloudflare PBKDF2 runtime cap must remain 100000");
if (/CURRENT_ITER\s*=\s*(?:1[0-9]{5,}|[2-9][0-9]{5,})/.test(security)) throw new Error("PBKDF2 iteration count exceeds Cloudflare Workers runtime support");

const index = fs.readFileSync(path.join(root, "src/index.js"), "utf8");
if (/fetch\(["']\/setup/.test(index)) throw new Error("Setup must remain a native server-rendered form");
if (!/method="post" action="\/setup"/.test(index)) throw new Error("Native setup form missing");
for (const route of ["/terms","/offerings","/enrollments","/offerings/:id/enroll","/enrollments/:id/status"]) if (!index.includes(`"${route}"`)) throw new Error(`Academic network route missing: ${route}`);
if (!/Student.*Course Offering|Course Offering.*Student/s.test(index)) throw new Error("Academic network UI is not connected");

for (const file of sourceFiles) execFileSync(process.execPath, ["--check", path.join(root, "src", file)], { stdio: "pipe" });

console.log("VALIDATION PASS: V1.4.0 Academic Network, schema v3 migrations, Terms/Semesters, Course Offerings, real Enrollments, permissions, version consistency, pinned tooling, secret scan, zero runtime dependencies, syntax");
