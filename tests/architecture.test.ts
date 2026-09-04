import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadAgents } from "../src/core/agents";
import { loadFlows, validateFlow } from "../src/core/flows";
import { runFlow, RunService, updateReviewStatus } from "../src/core/orchestrator";
import { FileRunStore } from "../src/storage/file-run-store";

describe("domain-oriented agent architecture", () => {
  it("keeps neutral runtime contracts independent of concrete infrastructure", async () => {
    const ports = await readFile(join(process.cwd(), "src/core/ports.ts"), "utf8");
    const orchestrator = await readFile(join(process.cwd(), "src/core/orchestrator.ts"), "utf8");
    const storage = await readFile(join(process.cwd(), "src/core/storage.ts"), "utf8");
    assert.doesNotMatch(ports, /retrieval\/local/);
    assert.doesNotMatch(orchestrator, /FileRunStore/);
    assert.doesNotMatch(storage, /from ["']\.\/orchestrator["']/);
  });

  it("loads the canonical Phase 5 Markdown agents and flow", async () => {
    const root = join(process.cwd(), "domains", "land-administration");
    const agents = await loadAgents(root);
    const flows = await loadFlows(root);
    const flow = flows.get("wv-land-well-reconciliation");
    assert.ok(flow);
    validateFlow(flow, agents);
    assert.deepEqual(flow.agents, ["land-case-intake", "land-well-reconciler", "case-synthesizer"]);
  });

  it("runs a flow with the deterministic mock executor and persists an audit record", async () => {
    const domainRoot = join(process.cwd(), "domains", "land-administration");
    const agents = await loadAgents(domainRoot);
    const flow = (await loadFlows(domainRoot)).get("parcel-transfer-review");
    assert.ok(flow);
    const root = await mkdtemp(join(tmpdir(), "business-agent-run-"));
    try {
      const store = new FileRunStore();
      const record = await runFlow({ root, domain: "land-administration", flow, agents, context: "# Case\n\n- Case ID: demo-1\n- Parcel ID: P-1\n" }, store);
      assert.equal(record.status, "complete");
      assert.equal(record.outputs.length, 4);
      assert.equal(record.reviewStatus, "pending-human-review");
      assert.equal(record.handoffs.length, 4);
      const approved = await updateReviewStatus(root, record.id, "approved", store);
      assert.equal(approved.reviewStatus, "approved");
      assert.match(await readFile(join(root, "runs", record.id, "run.json"), "utf8"), /"flow": "parcel-transfer-review"/);
      assert.match(await readFile(join(root, "runs", record.id, "agents", "intake-reviewer.md"), "utf8"), /Status: complete/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a flow that references an unknown agent", async () => {
    const root = join(process.cwd(), "domains", "land-administration");
    const agents = await loadAgents(root);
    const flow = (await loadFlows(root)).get("parcel-transfer-review");
    assert.ok(flow);
    assert.throws(() => validateFlow({ ...flow, agents: ["missing-agent"] }, agents), /missing agent/);
  });

  it("executes the research-derived lease and division-order flows", async () => {
    const domainRoot = join(process.cwd(), "domains", "land-administration");
    const agents = await loadAgents(domainRoot);
    const flows = await loadFlows(domainRoot);
    const root = await mkdtemp(join(tmpdir(), "business-agent-research-flows-"));
    try {
      const store = new FileRunStore();
      for (const flowId of ["lease-lifecycle-review", "division-order-preparation", "assignment-transfer-review"]) {
        const flow = flows.get(flowId);
        assert.ok(flow);
        const record = await new RunService(store).runFlow({ root, domain: "land-administration", flow, agents, context: `# ${flowId}\n\n- Seed case: LA-100\n` });
        assert.equal(record.status, "complete");
        assert.equal(record.outputs.length, flow.agents.length);
        assert.equal(record.handoffs.length, flow.agents.length);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retries a failed agent up to maxAttempts", async () => {
    const domainRoot = join(process.cwd(), "domains", "land-administration");
    const agents = await loadAgents(domainRoot);
    const flow = (await loadFlows(domainRoot)).get("lease-lifecycle-review");
    assert.ok(flow);
    let attempts = 0;
    const root = await mkdtemp(join(tmpdir(), "business-agent-retry-"));
    try {
      const record = await runFlow({ root, domain: "land-administration", flow, agents, maxAttempts: 2, context: "retry", executor: { async execute(agent) { attempts += 1; return attempts === 1 ? { agentId: agent.id, status: "failed", output: "", error: "transient" } : { agentId: agent.id, status: "complete", output: "ok" }; } } }, new FileRunStore());
      assert.equal(record.status, "complete");
      assert.equal(attempts, flow.agents.length + 1);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
