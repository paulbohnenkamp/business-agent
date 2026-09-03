import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadAgents } from "../src/core/agents";
import { executeOrderedSteps, typedStep } from "../src/core/typed-flow";
import { executeWvLandFlow, type AgentExecutionRequest, type IntakeResult, type ReconciliationResult, type SubmittedLandPackage, type SynthesisResult, type WvAgentExecutor, type WvFlowInput } from "../src/domains/wv-land";
import type { Conflict, Finding, SourceSnapshot, Unknown, WvEvidence } from "../src/domains/wv-land";
import type { ProductionAggregationResult } from "../src/domains/wv-land";

const root = "domains/land-administration";
const fixtureRoot = join(process.cwd(), "fixtures/wv-land/braxton-4700701733");
const submitted: SubmittedLandPackage = { caseId: "synthetic-case-other-api", synthetic: true, clues: { apiNumber: "3900100001" }, claims: [], titleAssertion: null };
const snapshot = { snapshotId: "snapshot-test", source: { id: "test", publisher: "Test", dataset: "well", mechanism: "arcgis-rest", authorityScope: "reported" }, requestUrl: "https://fixture.test/well", retrievedAt: "2026-09-03T00:00:00Z", contentType: "application/json", contentHash: "a".repeat(64), rawSnapshotRef: "fixture:test", byteLength: 1, immutable: true } satisfies SourceSnapshot;
const evidence = { evidenceId: "evidence-test", snapshotId: snapshot.snapshotId, source: snapshot.source, sourceRecordId: "record-test", sourceUrl: snapshot.requestUrl, retrievedAt: snapshot.retrievedAt, contentHash: snapshot.contentHash, rawSnapshotRef: snapshot.rawSnapshotRef, normalizedFacts: { apiNumber: "3900100001", productionEvidenceIds: [], evidenceIds: ["evidence-test"] }, warnings: [] } as WvEvidence;
const noEvidence: ProductionAggregationResult = { status: "no-evidence", aggregates: [], evidenceIds: [], reason: "No production evidence matched the query." };
const unknown: Unknown = { unknownId: "unknown-1", subject: "title", question: "Does public evidence establish title?", reason: "Public well evidence is not title evidence.", createdAt: "2026-09-03T00:00:00Z" };
const finding: Finding = { findingId: "finding-1", caseId: submitted.caseId, subject: "well identity", assertion: "The supplied API clue is comparable to the supplied evidence.", status: "supported", confidence: "medium", evidenceIds: [evidence.evidenceId], conflictIds: [], unknownIds: [], provenance: { runId: "run-test", stepId: "land-well-reconciler", inputRecordIds: [evidence.sourceRecordId], sourceEvidenceIds: [evidence.evidenceId], producerVersion: "test-executor-1" }, producer: "test-executor", producedAt: "2026-09-03T00:00:00Z" };
const reconciliation: ReconciliationResult = { kind: "reconciliation", caseId: submitted.caseId, findings: [finding], conflicts: [], unknowns: [unknown], evidenceRefs: [evidence.evidenceId, snapshot.snapshotId], route: "human-review" };
const synthesis: SynthesisResult = { kind: "synthesis", caseId: submitted.caseId, findings: reconciliation.findings, conflicts: [], unknowns: reconciliation.unknowns, evidenceRefs: reconciliation.evidenceRefs, synthesis: "Evidence is available for human review.", proposedRoute: "human-review" };
const input: WvFlowInput = { caseId: submitted.caseId, submittedPackage: submitted, sourceEvidence: [evidence], sourceSnapshots: [snapshot], deterministicResults: [noEvidence], evidenceAcquisition: [{ sourceId: "test", required: true, status: "succeeded", evidenceIds: [evidence.evidenceId] }] };

class StubExecutor implements WvAgentExecutor {
  constructor(private readonly outputs: ReadonlyMap<string, unknown>, private readonly failures = new Set<string>(), private readonly throws = new Set<string>()) {}
  readonly requests: AgentExecutionRequest<unknown>[] = [];
  async execute<TInput, TOutput>(request: AgentExecutionRequest<TInput>) {
    this.requests.push(request as AgentExecutionRequest<unknown>);
    if (this.throws.has(request.agent.id)) throw new Error(`provider threw for ${request.agent.id}`);
    if (this.failures.has(request.agent.id)) return { status: "failed", kind: "execution", error: "test execution failure" } as const;
    return { status: "succeeded", artifact: this.outputs.get(request.agent.id) as TOutput } as const;
  }
}

function intake(): IntakeResult { return { kind: "intake", caseId: input.caseId, caseScope: "well-reconciliation", suppliedClues: submitted.clues, missingEvidence: [], ambiguousInputs: [], candidateQueries: ["api:3900100001"], route: "continue", evidenceIds: [evidence.evidenceId] }; }

describe("WV land Phase 5 typed flow", () => {
  it("keeps the generic core independent of a fixed topology", async () => {
    const steps = [typedStep<number, string>({ id: "one", required: true, validateInput: (value): value is number => typeof value === "number", validateOutput: (value): value is string => typeof value === "string", execute: async (value) => ({ status: "succeeded", artifact: String(value + 1) }) }), typedStep<string, boolean>({ id: "two", required: true, validateInput: (value): value is string => typeof value === "string", validateOutput: (value): value is boolean => typeof value === "boolean", execute: async (value) => ({ status: "succeeded", artifact: value === "2" }) })];
    const result = await executeOrderedSteps(1, steps);
    assert.equal(result.status, "succeeded");
    assert.deepEqual(result.steps.map((step) => step.stepId), ["one", "two"]);
  });

  it("turns an input-validator exception into validation failure and blocks later steps", async () => {
    const result = await executeOrderedSteps("input", [
      typedStep<string, string>({ id: "input-check", required: true, validateInput: (value): value is string => { throw new Error("input validator failed"); }, validateOutput: (value): value is string => typeof value === "string", execute: async (value) => ({ status: "succeeded", artifact: value }) }),
      typedStep<string, string>({ id: "dependent", required: true, validateInput: (value): value is string => typeof value === "string", validateOutput: (value): value is string => typeof value === "string", execute: async (value) => ({ status: "succeeded", artifact: value }) }),
    ]);
    assert.equal(result.status, "failed");
    assert.equal(result.failure?.kind, "validation");
    assert.deepEqual(result.steps.map((step) => step.status), ["failed", "blocked"]);
    assert.deepEqual(result.artifacts, []);
  });

  it("turns an output-validator exception into validation failure while preserving prior artifacts", async () => {
    const result = await executeOrderedSteps(1, [
      typedStep<number, string>({ id: "producer", required: true, validateInput: (value): value is number => typeof value === "number", validateOutput: (value): value is string => typeof value === "string", execute: async (value) => ({ status: "succeeded", artifact: String(value) }) }),
      typedStep<string, boolean>({ id: "output-check", required: true, validateInput: (value): value is string => typeof value === "string", validateOutput: (value): value is boolean => { throw new Error("output validator failed"); }, execute: async () => ({ status: "succeeded", artifact: true }) }),
      typedStep<boolean, string>({ id: "blocked", required: true, validateInput: (value): value is boolean => typeof value === "boolean", validateOutput: (value): value is string => typeof value === "string", execute: async () => ({ status: "succeeded", artifact: "unexpected" }) }),
    ]);
    assert.equal(result.status, "failed");
    assert.equal(result.failure?.kind, "validation");
    assert.deepEqual(result.artifacts, ["1"]);
    assert.deepEqual(result.steps.map((step) => step.status), ["succeeded", "failed", "blocked"]);
  });

  it("propagates valid structured artifacts and preserves evidence context", async () => {
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", reconciliation], ["case-synthesizer", synthesis]]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "complete");
    assert.equal(result.synthesis?.proposedRoute, "human-review");
    assert.deepEqual(result.evidenceRefs, [evidence.evidenceId, snapshot.snapshotId]);
    assert.equal(executor.requests[0]?.evidence[0]?.sourceRecordId, "record-test");
    assert.deepEqual(executor.requests[0]?.deterministicResults, [noEvidence]);
  });

  it("passes conservative production result states through without changing them", async () => {
    const reportedZero: ProductionAggregationResult = { status: "aggregated", aggregates: [{ apiNumber: "3900100001", period: { year: 2025 }, gasMcf: 0, evidenceIds: ["production-zero"], recordCount: 1 }], evidenceIds: ["production-zero"] };
    const incompatible: ProductionAggregationResult = { status: "incompatible", aggregates: [], evidenceIds: ["production-a", "production-b"], reason: "Overlapping evidence" };
    const productionInput = { ...input, deterministicResults: [noEvidence, reportedZero, incompatible] };
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", reconciliation], ["case-synthesizer", synthesis]]));
    await executeWvLandFlow(productionInput, await loadAgents(root), executor);
    assert.deepEqual(executor.requests[0]?.deterministicResults, [noEvidence, reportedZero, incompatible]);
  });

  it("treats invalid structured output as execution failure and blocks synthesis", async () => {
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", { kind: "reconciliation", caseId: input.caseId }], ["case-synthesizer", synthesis]]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "failed");
    assert.equal(result.executionFailure?.kind, "validation");
    assert.deepEqual(result.steps.map((step) => step.status), ["succeeded", "failed", "blocked"]);
    assert.equal(executor.requests.length, 2);
  });

  it("rejects a valid Finding whose case ID differs from the enclosing flow case", async () => {
    const mismatched = { ...finding, caseId: "different-case" };
    const badReconciliation = { ...reconciliation, findings: [mismatched] };
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", badReconciliation], ["case-synthesizer", synthesis]]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "failed");
    assert.equal(result.executionFailure?.kind, "validation");
    assert.equal(result.executionFailure?.stepId, "land-well-reconciler");
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.unknowns, []);
    assert.deepEqual(result.steps.map((step) => step.status), ["succeeded", "failed", "blocked"]);
    assert.equal(executor.requests.length, 2);
  });

  it("preserves upstream artifacts when a later required step fails", async () => {
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()]]), new Set(["land-well-reconciler"]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "failed");
    assert.equal(result.steps[0]?.status, "succeeded");
    assert.equal(result.executionFailure?.stepId, "land-well-reconciler");
  });

  it("keeps business uncertainty successful when the agent execution succeeds", async () => {
    const uncertain = { ...reconciliation, findings: [], route: "human-review" as const };
    const uncertainSynthesis = { ...synthesis, findings: [], proposedRoute: "human-review" as const };
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", uncertain], ["case-synthesizer", uncertainSynthesis]]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "complete");
    assert.equal(result.unknowns.length, 1);
    assert.equal(result.executionFailure, undefined);
  });

  it("stops after intake execution failure", async () => {
    const executor = new StubExecutor(new Map<string, unknown>(), new Set(["land-case-intake"]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "failed");
    assert.equal(result.executionFailure?.stepId, "land-case-intake");
    assert.deepEqual(result.steps.map((step) => step.status), ["failed", "blocked", "blocked"]);
  });

  it("normalizes thrown executor errors for every required agent", async () => {
    for (const failingId of ["land-case-intake", "land-well-reconciler", "case-synthesizer"]) {
      const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", reconciliation], ["case-synthesizer", synthesis]]), new Set(), new Set([failingId]));
      const result = await executeWvLandFlow(input, await loadAgents(root), executor);
      assert.equal(result.status, "failed");
      assert.equal(result.executionFailure?.kind, "execution");
      assert.match(result.executionFailure?.message ?? "", /execution threw/);
      assert.equal(executor.requests.at(-1)?.agent.id, failingId);
    }
  });

  it("keeps successful acquisition with no evidence distinct from acquisition failure", async () => {
    const noMatch = await executeWvLandFlow(input, await loadAgents(root), new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", reconciliation], ["case-synthesizer", synthesis]])));
    assert.equal(noMatch.status, "complete");
    const failedInput = { ...input, evidenceAcquisition: [{ sourceId: "test", required: true, status: "failed" as const, evidenceIds: [], error: "source unavailable" }] };
    const failed = await executeWvLandFlow(failedInput, await loadAgents(root), new StubExecutor(new Map<string, unknown>()));
    assert.equal(failed.status, "failed");
    assert.equal(failed.executionFailure?.stepId, "evidence-acquisition:test");
  });

  it("enforces the immutable artifact boundary", async () => {
    const mutable = { ...reconciliation, findings: [] };
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", intake()], ["land-well-reconciler", mutable], ["case-synthesizer", synthesis]]));
    const result = await executeWvLandFlow(input, await loadAgents(root), executor);
    assert.equal(result.status, "complete");
    assert.equal(Object.isFrozen(result.steps[1]?.status === "succeeded" ? result.steps[1].artifact : null), true);
    assert.deepEqual(mutable.findings, []);
  });

  it("passes the frozen flagship evidence through without merging publishers", async () => {
    const fixtureInput = JSON.parse(await readFile(join(fixtureRoot, "input/submitted-land-package.json"), "utf8")) as SubmittedLandPackage;
    const dep = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvdep-well.json"), "utf8")) as WvEvidence[];
    const ges = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvges-well.json"), "utf8")) as WvEvidence[];
    const production: ProductionAggregationResult = { status: "no-evidence", aggregates: [], evidenceIds: [], reason: "The captured workbook has no matching row." };
    const fixtureFlow: WvFlowInput = { caseId: fixtureInput.caseId, submittedPackage: fixtureInput, sourceEvidence: [...dep, ...ges], sourceSnapshots: [], deterministicResults: [production], evidenceAcquisition: [{ sourceId: "wvdep-oog-rbdms-wells", required: true, status: "succeeded", evidenceIds: dep.map((item) => item.evidenceId) }, { sourceId: "wvges-oilgas-wells", required: true, status: "succeeded", evidenceIds: ges.map((item) => item.evidenceId) }, { sourceId: "wvdep-annual-production", required: true, status: "succeeded", evidenceIds: [] }] };
    const fixtureSnapshots = JSON.parse(await readFile(join(fixtureRoot, "manifest.json"), "utf8")) as { snapshots: SourceSnapshot[] };
    const validInput = { ...fixtureFlow, sourceSnapshots: fixtureSnapshots.snapshots };
    const fixtureIntake = { ...intake(), caseId: fixtureInput.caseId };
    const fixtureReconciliation = { ...reconciliation, caseId: fixtureInput.caseId, findings: [], evidenceRefs: [...dep, ...ges].map((item) => item.evidenceId), unknowns: [unknown] };
    const fixtureSynthesis = { ...synthesis, caseId: fixtureInput.caseId, findings: [], evidenceRefs: fixtureReconciliation.evidenceRefs, unknowns: [unknown] };
    const executor = new StubExecutor(new Map<string, unknown>([["land-case-intake", fixtureIntake], ["land-well-reconciler", fixtureReconciliation], ["case-synthesizer", fixtureSynthesis]]));
    const result = await executeWvLandFlow(validInput, await loadAgents(root), executor);
    assert.equal(result.status, "complete");
    assert.equal(executor.requests[0]?.evidence.length, 5);
    assert.deepEqual(executor.requests[0]?.evidence.map((item) => item.source.id), ["wvdep-oog-rbdms-wells", "wvdep-oog-rbdms-wells", "wvdep-oog-rbdms-wells", "wvges-oilgas-wells", "wvges-oilgas-wells"]);
    assert.ok(executor.requests[0]?.evidence.some((item) => "sourceRecordType" in item.normalizedFacts && item.normalizedFacts.sourceRecordType === "Original Location"));
    assert.ok(executor.requests[0]?.evidence.some((item) => "sourceRecordType" in item.normalizedFacts && item.normalizedFacts.sourceRecordType === "Plugging" && "wellNumber" in item.normalizedFacts && item.normalizedFacts.wellNumber === "3-S-245"));
    assert.deepEqual(executor.requests[0]?.deterministicResults, [production]);
  });
});
