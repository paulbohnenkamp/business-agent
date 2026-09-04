import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getDemoReview, loadDemoCase, runDemo } from "../src/domains/wv-land/demo";

describe("local WV demo boundary", () => {
  it("loads the synthetic case and runs all three typed agents into human review", async () => {
    const root = await mkdtemp(join(tmpdir(), "business-agent-demo-test-"));
    const previous = process.env.BUSINESS_AGENT_WORKSPACE;
    process.env.BUSINESS_AGENT_WORKSPACE = root;
    try {
      const caseData = await loadDemoCase();
      assert.equal(caseData.submittedPackage.synthetic, true);
      assert.equal(caseData.evidence.filter((item) => item.source.publisher === "WVDEP").length, 3);
      assert.equal(caseData.evidence.filter((item) => item.source.publisher === "WVGES").length, 2);
      const aggregate = await runDemo();
      assert.equal(aggregate.result.status, "complete");
      assert.deepEqual(aggregate.result.steps.map((step) => step.status), ["succeeded", "succeeded", "succeeded"]);
      assert.equal(aggregate.result.conflicts[0]?.subject, "operator");
      assert.equal(aggregate.result.unknowns.some((item) => item.subject === "production"), true);
      assert.equal(aggregate.result.synthesis?.proposedRoute, "human-review");
      assert.equal((await getDemoReview(aggregate.runId)).state, "pending-human-review");
    } finally {
      if (previous === undefined) delete process.env.BUSINESS_AGENT_WORKSPACE;
      else process.env.BUSINESS_AGENT_WORKSPACE = previous;
      await rm(root, { recursive: true, force: true });
    }
  });
});
