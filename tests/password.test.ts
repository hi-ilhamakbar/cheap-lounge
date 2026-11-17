import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/auth/password.ts";

test("scrypt password hash verifies and rejects", async () => {
  const h = await hashPassword("correct horse battery staple");
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.equal(await verifyPassword("correct horse battery staple", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});
