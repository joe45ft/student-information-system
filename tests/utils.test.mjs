import test from "node:test";
import assert from "node:assert/strict";
import { html, normalizeEmail, pageNumber, parseCsv, validIsoDate, validatePassword } from "../src/utils.js";
import { studentInput, userInput } from "../src/validation.js";

test("CSV quotes",()=>assert.deepEqual(parseCsv('student_code,full_name\nS1,"Ahmed, Hany"\n'),[["student_code","full_name"],["S1","Ahmed, Hany"]]));

test("password policy",()=>{
  assert.equal(validatePassword("StrongPass123").length,0);
  assert.ok(validatePassword("weak").length>0);
});

test("email normalization",()=>assert.equal(normalizeEmail("  A@EXAMPLE.COM "),"a@example.com"));

test("date and pagination validation",()=>{
  assert.equal(validIsoDate("2026-08-18"),true);
  assert.equal(validIsoDate("2026-02-30"),false);
  assert.equal(pageNumber("3"),3);
  assert.equal(pageNumber("-2"),1);
});

test("HTML responses include production security and indexing headers",()=>{
  const response=html("<p>ok</p>");
  assert.equal(response.headers.get("x-content-type-options"),"nosniff");
  assert.equal(response.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
  assert.match(response.headers.get("content-security-policy"),/script-src 'self'/);
});

test("student server validation rejects unsafe values",()=>{
  const parsed=studentInput({student_code:"S1",full_name:"Student",email:"bad",gender:"Unknown",status:"HACKED"});
  assert.ok(parsed.errors.length>=3);
});

test("user server validation enforces role and status allowlists",()=>{
  const parsed=userInput({full_name:"Admin",email:"admin@example.com",role:"SUPERADMIN",status:"ACTIVE"});
  assert.ok(parsed.errors.some(error=>error.includes("role")));
});
