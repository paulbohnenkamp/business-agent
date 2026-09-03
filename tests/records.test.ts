import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateRecordText } from "../scripts/validate-records";

const validSpec = `---\nid: example\ntitle: Example\nstatus: approved\ncreated: 2026-01-01\nupdated: 2026-01-01\nresult: results/example.md\n---\n\n## Goal\n## Non-goals\n## Current-state findings\n## Chosen approach\n## Alternatives considered\n## Affected files or modules\n## Milestones\n## Acceptance criteria\n## Verification commands\n## Risks and open questions\n## Progress log\n## Decision log\n`;

const validResult = `---\nid: example\ntitle: Example\nstatus: completed\nspec: specs/example.md\ncompleted: 2026-01-01\n---\n\n## What changed\n## Files changed\n## Checks run and results\n## Deviations from the spec\n## Important decisions\n## Remaining follow-ups\n`;

describe("execution record validation", () => {
  it("accepts valid spec and result records", () => {
    assert.deepEqual(validateRecordText("specs/example.md", validSpec, "spec"), []);
    assert.deepEqual(validateRecordText("results/example.md", validResult, "result"), []);
  });

  it("reports missing fields and sections", () => {
    const errors = validateRecordText("specs/example.md", "# incomplete", "spec");
    assert.equal(errors.some((error) => error.message.includes("missing front matter field: id")), true);
    assert.equal(errors.some((error) => error.message.includes("missing required section: Goal")), true);
  });

  it("rejects invalid status and mismatched ids", () => {
    const errors = validateRecordText("specs/actual.md", validSpec.replace("id: example", "id: other").replace("status: approved", "status: waiting"), "spec");
    assert.deepEqual(errors.map((error) => error.message).filter((message) => message === "invalid spec status: waiting" || message === "id must match filename: actual"), ["invalid spec status: waiting", "id must match filename: actual"]);
  });

  it("requires completed results", () => {
    const errors = validateRecordText("results/example.md", validResult.replace("status: completed", "status: proposed"), "result");
    assert.deepEqual(errors, [{ file: "results/example.md", message: "result status must be completed" }]);
  });
});
