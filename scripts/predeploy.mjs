import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const configPath = path.join(root, "wrangler.jsonc");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const errors = [];

if (config.name !== "student-information-system") errors.push(`Worker name must be student-information-system (found ${config.name || "missing"}).`);
const d1 = Array.isArray(config.d1_databases) ? config.d1_databases.find(item => item?.binding === "DB") : null;
if (!d1) errors.push("Missing Cloudflare D1 binding named DB.");
if (d1 && (!d1.database_name || !d1.database_id)) errors.push("Production D1 is not pinned. Add database_name and database_id for the EXISTING D1 database before deploy.");
if (d1?.database_id && !/^[0-9a-f-]{32,40}$/i.test(d1.database_id)) errors.push("D1 database_id does not look like a valid UUID.");
if (config.vars?.APP_VERSION !== "1.4.3") errors.push("APP_VERSION in wrangler.jsonc must be 1.4.3.");

if (errors.length) {
  console.error("\nPREDEPLOY BLOCKED — production safety check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  console.error("\nRun: npx wrangler d1 list");
  console.error("Then run: npm run configure:production -- --database-name <EXISTING_D1_NAME> --database-id <EXISTING_D1_UUID>");
  console.error("Do not create, reset, or replace the existing production database.\n");
  process.exit(1);
}
console.log(`PREDEPLOY PASS: Worker ${config.name}, D1 ${d1.database_name} (${d1.database_id}), version ${config.vars.APP_VERSION}`);
