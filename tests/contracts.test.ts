import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAgentOutput } from "../src/core/contracts";
import { canAccessCase, requireRole } from "../src/core/security";

test("structured agent output contract accepts a safe result and rejects drift", () => {
  const output = validateAgentOutput({ schemaVersion: "1.0", agentId: "a", status: "complete", findings: [], unknowns: [], conflicts: [], route: "human-review" });
  assert.equal(output.route, "human-review");
  assert.throws(() => validateAgentOutput({ schemaVersion: "1.0", agentId: "a", status: "complete", findings: [], unknowns: [], conflicts: [], route: "approve" }), /route/);
});

test("structured output is a typed runtime boundary", () => {
  const valid = { schemaVersion: "1.0" as const, agentId: "a", status: "complete" as const, findings: [], unknowns: [], conflicts: [], route: "continue" as const };
  assert.equal(validateAgentOutput(valid).schemaVersion, "1.0");
});

test("tenant and role controls reject unauthorized identity", () => {
  const identity = { subject: "u1", tenantId: "t1", roles: ["reviewer"] };
  assert.equal(canAccessCase(identity, "t1"), true);
  assert.equal(canAccessCase(identity, "t2"), false);
  requireRole(identity, "reviewer");
  assert.throws(() => requireRole(identity, "approver"), /approver/);
});
