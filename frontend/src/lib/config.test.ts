import assert from "node:assert/strict";
import test from "node:test";

import { apiBaseUrl } from "./config.ts";

test("frontend API fallback points at the local FastAPI development port", () => {
  assert.equal(apiBaseUrl, "http://127.0.0.1:18001");
});
