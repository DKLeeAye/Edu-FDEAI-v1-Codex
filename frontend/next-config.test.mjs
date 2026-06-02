import assert from "node:assert/strict";
import test from "node:test";

import nextConfig from "./next.config.mjs";

test("Next dev server allows loopback host used during local testing", () => {
  assert.ok(nextConfig.allowedDevOrigins?.includes("127.0.0.1"));
});
