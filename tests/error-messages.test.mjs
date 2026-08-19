import test from "node:test";
import assert from "node:assert/strict";
import { studentInput, enrollmentInput } from "../src/validation.js";
import { validatePassword } from "../src/utils.js";

test("validation errors tell the user what to fix", () => {
  const s = studentInput({ full_name:"", email:"bad", gender:"X", status:"BAD" });
  assert.ok(s.errors.some(x => x.includes("full name")));
  assert.ok(s.errors.some(x => x.includes("email address")));
  assert.ok(s.errors.every(x => !/^Invalid\b/.test(x)));
});

test("enrollment validation uses actionable wording", () => {
  const e = enrollmentInput({ student_id:"", offering_id:"", status:"BAD" });
  assert.ok(e.errors.some(x => x.includes("Choose a student")));
  assert.ok(e.errors.some(x => x.includes("course offering")));
  assert.ok(e.errors.every(x => !/^Invalid\b/.test(x)));
});

test("password validation explains requirements", () => {
  const errors = validatePassword("x");
  assert.ok(errors.some(x => x.includes("8 characters")));
  assert.ok(errors.some(x => x.includes("uppercase")));
  assert.ok(errors.some(x => x.includes("number")));
});
