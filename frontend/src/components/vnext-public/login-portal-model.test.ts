import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialLoginFormState,
  demoPassword,
  roleConfig,
} from "./login-portal-model.ts";

test("login portal defaults to empty fields for Open Design visual parity", () => {
  assert.deepEqual(createInitialLoginFormState({ role: null, demo: null }), {
    account: "",
    password: "",
    role: "student",
  });
});

test("login portal only prefills demo credentials when explicitly requested", () => {
  assert.deepEqual(createInitialLoginFormState({ role: "teacher", demo: "1" }), {
    account: roleConfig.teacher.email,
    password: demoPassword,
    role: "teacher",
  });
});

