import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const readArg = name => { const i=argv.indexOf(`--${name}`); return i>=0 ? argv[i+1] : ""; };
const databaseName = readArg("database-name");
const databaseId = readArg("database-id");
if (!databaseName || !databaseId || !/^[0-9a-f-]{32,40}$/i.test(databaseId)) {
  console.error("Usage: node scripts/configure-production.mjs --database-name <EXISTING_D1_NAME> --database-id <EXISTING_D1_UUID>");
  console.error("Use the existing database values returned by: npx wrangler d1 list");
  process.exit(1);
}
const root = fileURLToPath(new URL("..", import.meta.url));
const configPath = path.join(root, "wrangler.jsonc");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.name = "student-information-system";
config.d1_databases = [{ binding:"DB", database_name:databaseName, database_id:databaseId, migrations_dir:"migrations" }];
config.vars = { ...(config.vars || {}), APP_NAME:config.vars?.APP_NAME || "Student IMS", APP_VERSION:"1.4.3" };
fs.writeFileSync(configPath, `${JSON.stringify(config,null,2)}\n`);
console.log(`Configured production Worker student-information-system with existing D1 ${databaseName} (${databaseId}).`);
