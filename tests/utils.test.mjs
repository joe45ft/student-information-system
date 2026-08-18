import test from "node:test";import assert from "node:assert/strict";import {parseCsv,validatePassword,normalizeEmail} from "../src/utils.js";
test("CSV quotes",()=>assert.deepEqual(parseCsv('student_code,full_name\nS1,"Ahmed, Hany"\n'),[["student_code","full_name"],["S1","Ahmed, Hany"]]));
test("password policy",()=>{assert.equal(validatePassword("StrongPass123").length,0);assert.ok(validatePassword("weak").length>0)});test("email normalize",()=>assert.equal(normalizeEmail("  A@EXAMPLE.COM "),"a@example.com"));
