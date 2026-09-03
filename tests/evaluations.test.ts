import assert from "node:assert/strict";
import { test } from "node:test";
import { loadEvaluationCases, evaluateExecutor, gradeEvaluationOutput, summarizeEvaluations } from "../src/evaluations/local";
import { MockExecutor } from "../src/core/orchestrator";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAgents } from "../src/core/agents";
import { loadFlows } from "../src/core/flows";
import { evaluateFlow } from "../src/evaluations/local";
import type { AgentDefinition } from "../src/core/agents";

const agent = { id: "evaluation-agent", version: "1.0.0", path: "test", description: "test", inputs: [], outputs: [], referencedSkills: [], permittedTools: [], body: "" } satisfies AgentDefinition;

test("loads structured evaluation envelopes", async () => {
  const cases = await loadEvaluationCases("evaluations/land-admin-cases.jsonl");
  assert.ok(cases.some((item) => item.expected?.requiredEvidence));
});

test("evaluation results include missing expectations and safety violations", async () => {
  const results = await evaluateExecutor(new MockExecutor(), agent, [{ id: "safety", input: "input", mustContain: ["absent"], expected: { mustNotClaim: ["complete"] } }]);
  assert.equal(results[0]?.passed, false);
  assert.deepEqual(results[0]?.missing, ["absent"]);
  assert.deepEqual(results[0]?.violations, ["complete"]);
});

test("evaluation grader enforces preservation and produces a summary", () => {
  const result = gradeEvaluationOutput({ id: "case", input: "", mustContain: [], expected: { mustPreserve: ["conflict"], route: "human-review" } }, { status: "complete", output: "conflict; route: human-review" });
  assert.equal(result.passed, true);
  assert.deepEqual(summarizeEvaluations([result]), { total: 1, passed: 1, failed: 0, results: [result] });
});

test("adversarial evaluation cases are available as a separate regression set", async () => {
  const cases = await loadEvaluationCases("evaluations/adversarial-land-admin.jsonl");
  assert.equal(cases.length, 3);
  assert.ok(cases.every((item) => item.expected?.noUnauthorizedAction));
});

test("full-flow evaluator grades the final handoff and review state", async () => {
  const agents = await loadAgents("domains/land-administration");
  const flow = (await loadFlows("domains/land-administration")).get("lease-lifecycle-review");
  assert.ok(flow);
  const root = await mkdtemp(join(tmpdir(), "business-agent-eval-flow-"));
  try {
    const results = await evaluateFlow(new MockExecutor(), flow, agents, root, [{ id: "flow", input: "seed", mustContain: ["Status: complete"], expectedReviewStatus: "pending-human-review" }]);
    assert.equal(results[0]?.passed, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
