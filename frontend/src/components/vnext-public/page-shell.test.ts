import assert from "node:assert/strict";
import test from "node:test";

import { loginPortalRootClass, marketingHomeRootClass } from "./page-shell-model.ts";

test("public marketing home exposes the theme class on rendered markup", () => {
  assert.equal(marketingHomeRootClass, "marketing-page");
});

test("login portal exposes the theme class on rendered markup", () => {
  assert.equal(loginPortalRootClass, "login-page login-shell");
});
