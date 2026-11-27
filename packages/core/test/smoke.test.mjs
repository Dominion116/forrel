import assert from "node:assert/strict";
import test from "node:test";

// Sanity check that core workspace test runner executes cleanly in Phase 0.
test("core phase 0 workspace check", () => {
  assert.equal(9800, 9800);
});
