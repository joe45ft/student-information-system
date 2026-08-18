import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/security.js";

const hash = await hashPassword("StrongPass123!", "test-pepper");
assert.match(hash, /^pbkdf2\$10000\$/);

assert.equal(
  await verifyPassword("StrongPass123!", hash, "test-pepper"),
  true
);

assert.equal(
  await verifyPassword("WrongPass123!", hash, "test-pepper"),
  false
);

console.log("SECURITY TEST PASS: PBKDF2 10000 + verification");
