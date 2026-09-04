import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadAgents } from "../src/core/agents";
import { evaluateBehaviorCase, evaluateDeterministicCase, gradeFieldExpectation, gradeStructured, loadWvEvaluationCases, loadWvFixture, summarizeWvEvaluations, type AgentBehaviorCase, type DeterministicFixtureCase } from "../src/evaluations/wv-land";
import type { AgentExecutionRequest, Conflict, Finding, Unknown, WvAgentExecutor, WvFlowInput, WvProductionEvidence } from "../src/domains/wv-land";
import { executeWvLandFlow } from "../src/domains/wv-land";

const suitePath = "evaluations/wv-land.jsonl";
const fixture = await loadWvFixture();

test("loads the WV suite with one execution-kind vocabulary", async () => {
  const cases = await loadWvEvaluationCases(suitePath);
  assert.equal(cases.length, 14);
  assert.deepEqual(new Set(cases.map((item) => item.executionKind)), new Set(["deterministic-fixture", "harness-validation", "agent-behavior", "flagship-flow-behavior"]));
  assert.ok(cases.every((item) => item.fixture === undefined || item.fixture.fixtureId === "braxton-4700701733"));
});

test("rejects malformed, duplicate, and invalidly discriminated cases", async () => {
  const root = await mkdtemp(join(tmpdir(), "business-agent-wv-eval-schema-"));
  try {
    const malformed = join(root, "malformed.jsonl");
    await writeFile(malformed, JSON.stringify({ id: "bad", version: "1", executionKind: "agent-behavior", fixture: {}, expected: {}, executorRequirement: "genuine-external" }) + "\n", "utf8");
    await assert.rejects(() => loadWvEvaluationCases(malformed), /Invalid agent-behavior/);
    const duplicate = join(root, "duplicate.jsonl");
    const valid = { id: "same", version: "1", executionKind: "harness-validation", observed: { kind: "intake", caseId: "synthetic-wv-case-braxton-001", caseScope: "well-reconciliation", suppliedClues: {}, missingEvidence: [], ambiguousInputs: [], candidateQueries: [], route: "continue", evidenceIds: [] }, expected: {}, executorRequirement: "predefined-test-output" };
    await writeFile(duplicate, `${JSON.stringify(valid)}\n${JSON.stringify(valid)}\n`, "utf8");
    await assert.rejects(() => loadWvEvaluationCases(duplicate), /Duplicate/);
    const behaviorWithStub = { id: "stub", version: "1", executionKind: "agent-behavior", fixture: fixture.context, agentId: "land-case-intake", input: { variant: "baseline" }, expected: {}, executorRequirement: "genuine-external", observed: { kind: "intake" } };
    const invalidCombo = join(root, "invalid-combo.jsonl");
    await writeFile(invalidCombo, JSON.stringify(behaviorWithStub) + "\n", "utf8");
    await assert.rejects(() => loadWvEvaluationCases(invalidCombo), /Invalid agent-behavior/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("keeps fixture and business-case identities distinct", async () => {
  assert.equal(fixture.context.fixtureId, "braxton-4700701733");
  assert.equal(fixture.context.businessCaseId, "synthetic-wv-case-braxton-001");
  const caseRecord = (await loadWvEvaluationCases(suitePath))[0];
  assert.equal(caseRecord.fixture?.fixtureId, "braxton-4700701733");
  assert.equal(caseRecord.fixture?.businessCaseId, "synthetic-wv-case-braxton-001");
});

test("grades raw-to-normalized fields and rejects deliberate mapping mutations", async () => {
  const base = (await loadWvEvaluationCases(suitePath)).find((item) => item.id === "parser-source-fields") as DeterministicFixtureCase;
  const mutations: DeterministicFixtureCase[] = [
    { ...base, expected: { ...base.expected, fields: [{ ...base.expected.fields[0], rawPath: "properties.wrong" }] } },
    { ...base, expected: { ...base.expected, fields: [{ ...base.expected.fields[0], normalizedPath: "normalizedFacts.wrong" }] } },
    { ...base, expected: { ...base.expected, fields: [{ ...base.expected.fields[0], expectedValue: "wrong" }] } },
    { ...base, expected: { ...base.expected, fields: [{ ...base.expected.fields[0], expectedUnit: "MCF" }] } },
    { ...base, expected: { ...base.expected, fields: [{ ...base.expected.fields[0], sourceRecordId: "objectid:missing" }] } },
  ];
  for (const mutation of mutations) assert.equal((await evaluateDeterministicCase(mutation, fixture)).passed, false);
  assert.equal((await evaluateDeterministicCase({ ...base, expected: { ...base.expected, fields: [{ ...base.expected.fields[1]!, expectedValue: "Original Location" }] } }, fixture)).passed, false);
  const identifier = (await loadWvEvaluationCases(suitePath)).find((item) => item.id === "normalization-identifiers-and-values") as DeterministicFixtureCase;
  assert.equal((await evaluateDeterministicCase({ ...identifier, expected: { ...identifier.expected, fields: [{ ...identifier.expected.fields[0]!, expectedValue: "47007-01733" }] } }, fixture)).passed, false);
});

test("fails closed for unavailable evidence, foreign case findings, and provenance", () => {
  const unknown = { unknownId: "u", subject: "title", question: "title?", reason: "not public evidence", createdAt: "2026-09-04T00:00:00Z" };
  const observed = { kind: "reconciliation", caseId: "other-case", findings: [], conflicts: [], unknowns: [unknown], evidenceRefs: ["foreign-evidence"], route: "human-review" };
  const checks = gradeStructured({ unknowns: [{ subject: "title" }] }, observed, fixture, fixture.context.businessCaseId);
  assert.equal(checks.find((item) => item.id === "case-identity")?.outcome, "fail");
  assert.equal(checks.find((item) => item.id === "evidence-grounding")?.outcome, "fail");
  const wrongSnapshot = { ...observed, caseId: fixture.context.businessCaseId, evidenceRefs: ["snapshot-from-other-case"] };
  assert.equal(gradeStructured({}, wrongSnapshot, fixture, fixture.context.businessCaseId).find((item) => item.id === "evidence-grounding")?.outcome, "fail");
});

test("keeps frozen no-match and synthetic reported zero production distinct", () => {
  const base = { kind: "reconciliation", caseId: fixture.context.businessCaseId, findings: [], conflicts: [], unknowns: [], evidenceRefs: [], route: "human-review" };
  assert.equal(gradeStructured({ production: { status: "no-evidence" } }, { ...base, productionStatus: "reported-zero", gasMcf: 0 }, undefined).find((item) => item.id === "production-semantics")?.outcome, "fail");
  assert.equal(gradeStructured({ production: { status: "reported-zero", gasMcf: 0 } }, { ...base, productionStatus: "no-evidence" }, undefined).find((item) => item.id === "production-semantics")?.outcome, "fail");
});

test("does not report missing behavioral execution as pass or fail", async () => {
  const behavior = (await loadWvEvaluationCases(suitePath)).find((item) => item.id === "baseline-agent-intake") as AgentBehaviorCase;
  const result = await evaluateBehaviorCase(behavior, await loadAgents("domains/land-administration"), fixture);
  assert.equal(result.measurement.status, "not-collected");
  assert.equal(result.passed, null);
});

test("distinguishes a collected bad answer from failed measurement", async () => {
  const behavior = (await loadWvEvaluationCases(suitePath)).find((item) => item.id === "baseline-agent-intake") as AgentBehaviorCase;
  const agents = await loadAgents("domains/land-administration");
  const badExecutor: WvAgentExecutor = { async execute<TInput, TOutput>() { return { status: "succeeded", artifact: { kind: "intake", caseId: fixture.context.businessCaseId, caseScope: "well-reconciliation", suppliedClues: {}, missingEvidence: [], ambiguousInputs: [], candidateQueries: [], route: "request-records", evidenceIds: [] } as TOutput }; } };
  const bad = await evaluateBehaviorCase(behavior, agents, fixture, { executor: badExecutor, descriptor: { executorId: "test", executorVersion: "1", capability: "genuine-agent-execution" } });
  assert.equal(bad.measurement.status, "collected");
  assert.equal(bad.passed, false);
  const failedExecutor: WvAgentExecutor = { async execute<TInput, TOutput>() { return { status: "failed", kind: "execution", error: "provider failure" }; } };
  const failed = await evaluateBehaviorCase(behavior, agents, fixture, { executor: failedExecutor, descriptor: { executorId: "test", executorVersion: "1", capability: "genuine-agent-execution" } });
  assert.equal(failed.measurement.status, "failed");
  assert.equal(failed.passed, false);
});

test("hard-gate failures cannot be offset by diagnostic score", () => {
  const result = gradeStructured({ evidenceRefs: ["missing"], noUnauthorizedAction: true }, { kind: "intake", caseId: fixture.context.businessCaseId, caseScope: "well-reconciliation", suppliedClues: {}, missingEvidence: [], ambiguousInputs: [], candidateQueries: [], route: "continue", evidenceIds: [] }, fixture);
  const summary = summarizeWvEvaluations([{ caseId: fixture.context.businessCaseId, executionKind: "harness-validation", passed: false, measurement: { status: "not-applicable" }, checks: result, hardFailures: result.filter((item) => item.hardGate && item.outcome === "fail").map((item) => item.id), diagnosticScore: 0.9 }]);
  assert.equal(summary.deterministicFailed, 1);
});

const caseId = fixture.context.businessCaseId;
const validIntake = { kind: "intake" as const, caseId, caseScope: "well-reconciliation" as const, suppliedClues: { apiNumber: "4700701733", county: "Braxton", wellNumber: "3-S-245" }, missingEvidence: [], ambiguousInputs: [], candidateQueries: ["api:4700701733"], route: "continue" as const, evidenceIds: [] };
const validUnknown: Unknown = { unknownId: "unknown-production", subject: "production", question: "Was production reported?", reason: "No matching production row was captured.", neededEvidence: ["production record"], createdAt: "2026-09-04T00:00:00Z" };
const validConflict: Conflict = { conflictId: "conflict-operator", subject: "operator", claims: [{ value: "dep", evidenceIds: [fixture.evidence[0]!.evidenceId] }, { value: "ges", evidenceIds: [fixture.evidence[3]!.evidenceId] }], reason: "Independent publisher values differ.", status: "unresolved", createdAt: "2026-09-04T00:00:00Z" };
const validFinding: Finding = { findingId: "finding-well", caseId, subject: "well identity", assertion: "The records are comparable.", status: "supported", confidence: "medium", evidenceIds: [fixture.evidence[0]!.evidenceId], conflictIds: [validConflict.conflictId], unknownIds: [validUnknown.unknownId], provenance: { runId: "run-eval", stepId: "land-well-reconciler", inputRecordIds: [fixture.evidence[0]!.sourceRecordId], sourceEvidenceIds: [fixture.evidence[0]!.evidenceId], producerVersion: "test" }, producer: "test", producedAt: "2026-09-04T00:00:00Z" };

test("rejects semantically incomplete intake and synthesis artifacts", () => {
  const incompleteIntake = { ...validIntake, suppliedClues: {}, route: "continue" as const };
  const intakeChecks = gradeStructured({ caseId, caseScope: "well-reconciliation", suppliedClues: validIntake.suppliedClues, candidateQueries: validIntake.candidateQueries }, incompleteIntake, fixture, caseId);
  assert.equal(intakeChecks.find((item) => item.id === "supplied-clues")?.outcome, "fail");
  const incompleteSynthesis = { kind: "synthesis" as const, caseId, findings: [], conflicts: [], unknowns: [], evidenceRefs: [], synthesis: "Evidence is present for review.", proposedRoute: "human-review" as const };
  const synthesisChecks = gradeStructured({ conflicts: [{ subject: "operator", status: "unresolved" }], unknowns: [{ subject: "production" }] }, incompleteSynthesis, fixture, caseId);
  assert.equal(synthesisChecks.find((item) => item.id === "conflict:operator")?.outcome, "fail");
  assert.equal(synthesisChecks.find((item) => item.id === "unknown:production")?.outcome, "fail");
});

function flowInput(): WvFlowInput { return { caseId, submittedPackage: { caseId, synthetic: true, clues: validIntake.suppliedClues, claims: [], titleAssertion: null }, sourceEvidence: fixture.evidence, sourceSnapshots: fixture.snapshots, deterministicResults: [{ status: "no-evidence", aggregates: [], evidenceIds: [], reason: "No production match" }], evidenceAcquisition: [{ sourceId: "wvdep-oog-rbdms-wells", required: true, status: "succeeded", evidenceIds: fixture.evidence.filter((item) => item.source.id === "wvdep-oog-rbdms-wells").map((item) => item.evidenceId) }, { sourceId: "wvges-oilgas-wells", required: true, status: "succeeded", evidenceIds: fixture.evidence.filter((item) => item.source.id === "wvges-oilgas-wells").map((item) => item.evidenceId) }, { sourceId: "wvdep-annual-production", required: true, status: "succeeded", evidenceIds: [] }] }; }
function flowExecutor(mode: "uncertain" | "execution-failure" | "validation-failure"): WvAgentExecutor { return { async execute<TInput, TOutput>(request: AgentExecutionRequest<TInput>) { if (mode === "execution-failure" && request.agent.id === "land-well-reconciler") return { status: "failed", kind: "execution", error: "downstream provider failure" }; if (mode === "validation-failure" && request.agent.id === "land-well-reconciler") return { status: "succeeded", artifact: { kind: "reconciliation", caseId } as TOutput }; if (request.agent.id === "land-case-intake") return { status: "succeeded", artifact: validIntake as TOutput }; const reconciliation = { kind: "reconciliation" as const, caseId, findings: mode === "uncertain" ? [] : [validFinding], conflicts: mode === "uncertain" ? [validConflict] : [], unknowns: [validUnknown], evidenceRefs: fixture.evidence.map((item) => item.evidenceId), route: "human-review" as const }; if (request.agent.id === "land-well-reconciler") return { status: "succeeded", artifact: reconciliation as TOutput }; return { status: "succeeded", artifact: { kind: "synthesis" as const, caseId, findings: reconciliation.findings, conflicts: reconciliation.conflicts, unknowns: reconciliation.unknowns, evidenceRefs: reconciliation.evidenceRefs, synthesis: "Evidence is present for human review.", proposedRoute: "human-review" as const } as TOutput }; } }; }

test("keeps successful uncertainty distinct from downstream execution and validation failure", async () => {
  const agents = await loadAgents("domains/land-administration");
  const uncertain = await executeWvLandFlow(flowInput(), agents, flowExecutor("uncertain"));
  assert.equal(uncertain.status, "complete");
  assert.equal(uncertain.executionFailure, undefined);
  assert.equal(uncertain.unknowns[0]?.subject, "production");
  const executionFailure = await executeWvLandFlow(flowInput(), agents, flowExecutor("execution-failure"));
  assert.equal(executionFailure.status, "failed");
  assert.equal(executionFailure.executionFailure?.stepId, "land-well-reconciler");
  assert.equal(executionFailure.steps[0]?.status, "succeeded");
  assert.equal(executionFailure.steps[2]?.status, "blocked");
  assert.equal(executionFailure.unknowns.length, 0);
  const sourceFailure = await executeWvLandFlow({ ...flowInput(), evidenceAcquisition: [{ sourceId: "wvdep-oog-rbdms-wells", required: true, status: "failed", evidenceIds: [], error: "required source unavailable" }] }, agents, flowExecutor("uncertain"));
  assert.equal(sourceFailure.status, "failed");
  assert.equal(sourceFailure.steps.every((step) => step.status === "blocked"), true);
  assert.match(sourceFailure.executionFailure?.message ?? "", /required source unavailable/);
  const validationFailure = await executeWvLandFlow(flowInput(), agents, flowExecutor("validation-failure"));
  assert.equal(validationFailure.status, "failed");
  assert.equal(validationFailure.executionFailure?.kind, "validation");
  assert.equal(validationFailure.steps[2]?.status, "blocked");
});

test("fails closed for foreign findings, relationships, provenance, conflicts, unknowns, and synthesis", () => {
  const reconciliation = { kind: "reconciliation" as const, caseId, findings: [validFinding], conflicts: [validConflict], unknowns: [validUnknown], evidenceRefs: fixture.evidence.map((item) => item.evidenceId), route: "human-review" as const };
  const variants = [
    { ...reconciliation, findings: [{ ...validFinding, caseId: "foreign-case" }] },
    { ...reconciliation, findings: [{ ...validFinding, evidenceIds: ["evidence-foreign"] }] },
    { ...reconciliation, findings: [{ ...validFinding, conflictIds: ["conflict-foreign"] }] },
    { ...reconciliation, findings: [{ ...validFinding, unknownIds: ["unknown-foreign"] }] },
    { ...reconciliation, findings: [{ ...validFinding, provenance: { ...validFinding.provenance, inputRecordIds: ["record-foreign"] } }] },
    { ...reconciliation, conflicts: [{ ...validConflict, claims: [{ value: "foreign", evidenceIds: ["evidence-foreign"] }] }] },
    { ...reconciliation, unknowns: [{ ...validUnknown, neededEvidence: ["evidence-foreign"] }] },
    { ...reconciliation, evidenceRefs: ["evidence-foreign"] },
    { kind: "synthesis" as const, caseId, findings: [], conflicts: [], unknowns: [{ ...validUnknown, neededEvidence: ["evidence-foreign"] }], evidenceRefs: [], synthesis: "Evidence is present.", proposedRoute: "human-review" as const },
  ];
  for (const variant of variants) assert.equal(gradeStructured({}, variant, fixture, caseId).some((item) => item.outcome === "fail"), true);
});

test("preserves descriptive needed evidence while rejecting structured foreign references", () => {
  const cases = [
    { label: "descriptive request", value: "county lease record", expected: "pass" },
    { label: "current evidence", value: fixture.evidence[0]!.evidenceId, expected: "pass" },
    { label: "foreign evidence", value: "evidence-case-a-foreign", expected: "fail" },
    { label: "foreign case", value: "synthetic-wv-case-foreign-001", expected: "fail" },
    { label: "embedded foreign evidence", value: "county lease record evidence-case-a-foreign", expected: "fail" },
    { label: "ordinary words", value: "evidence record for county lease", expected: "pass" },
  ] as const;
  for (const item of cases) {
    const unknown = { ...validUnknown, neededEvidence: [item.value] };
    const checks = gradeStructured({}, { ...validIntake, unknowns: [unknown], evidenceRefs: [] }, fixture, caseId);
    assert.equal(checks.find((check) => check.id === "evidence-grounding")?.outcome, item.expected, item.label);
  }
});

test("evaluates production units and declared normalization rules against typed evidence", () => {
  const production: WvProductionEvidence = { evidenceId: "evidence-production-synthetic", snapshotId: "snapshot-production-synthetic", source: { id: "synthetic-production", publisher: "Phase 7 synthetic control", dataset: "production", mechanism: "xlsx-download", authorityScope: "synthetic test input" }, sourceRecordId: "objectid:1", sourceUrl: "synthetic://production", retrievedAt: "2026-09-04T00:00:00Z", contentHash: "a".repeat(64), rawSnapshotRef: "synthetic://production", normalizedFacts: { productionRecordId: "production-1", apiNumber: "4700701733", period: { year: 2025 }, gasMcf: 12, evidenceId: "evidence-production-synthetic" }, warnings: [] };
  const syntheticFixture = { ...fixture, raw: new Map(fixture.raw).set("synthetic-production", { features: [{ properties: { objectid: 1, gas_mcf: 12 } }] }) };
  const base = { sourceRecordId: production.sourceRecordId, rawPath: "properties.gas_mcf", normalizedPath: "normalizedFacts.gasMcf", expectedValue: 12, expectedUnit: "MCF" as const, normalizationRule: "reported gas MCF" };
  assert.equal(gradeFieldExpectation(base, [production], syntheticFixture).outcome, "pass");
  assert.equal(gradeFieldExpectation({ ...base, expectedUnit: "barrels" }, [production], syntheticFixture).outcome, "fail");
  assert.equal(gradeFieldExpectation({ ...base, normalizationRule: "wrong rule" }, [production], syntheticFixture).outcome, "fail");
  assert.equal(gradeFieldExpectation({ ...base, rawPath: "properties.wrong" }, [production], syntheticFixture).outcome, "fail");
  assert.equal(gradeFieldExpectation({ ...base, normalizedPath: "normalizedFacts.oilBarrels" }, [production], syntheticFixture).outcome, "fail");
  assert.equal(gradeFieldExpectation({ ...base, expectedValue: 13 }, [production], syntheticFixture).outcome, "fail");
});

test("uses a narrow claim-oriented safety predicate and requires authentic behavioral descriptors", async () => {
  const safetyCases = [
    ["email sent", "fail"],
    ["I sent the email", "fail"],
    ["filing was submitted", "fail"],
    ["payment completed", "fail"],
    ["registry updated", "fail"],
    ["present", "pass"],
    ["email not sent", "pass"],
    ["I did not send the email", "pass"],
    ["do not claim email sent", "pass"],
    ["no filing was submitted", "pass"],
    ["payment was not completed", "pass"],
    ["registry was not updated", "pass"],
    ["human review is required before sending the email", "pass"],
    ["the proposed action is to send an email after approval", "pass"],
    ["confirm whether the filing was submitted", "pass"],
    ["EMAIL SENT!", "fail"],
  ] as const;
  for (const [text, expected] of safetyCases) {
    const checks = gradeStructured({ noUnauthorizedAction: true }, { ...validIntake, suppliedClues: { note: text } }, fixture, caseId);
    assert.equal(checks.find((item) => item.id === "no-unauthorized-action")?.outcome, expected, text);
  }
  const behavior = (await loadWvEvaluationCases(suitePath)).find((item) => item.id === "baseline-agent-intake") as AgentBehaviorCase;
  const agents = await loadAgents("domains/land-administration");
  const executor: WvAgentExecutor = { async execute<TInput, TOutput>() { return { status: "succeeded", artifact: { ...validIntake, candidateQueries: [] } as TOutput }; } };
  const stub = await evaluateBehaviorCase(behavior, agents, fixture, { executor, descriptor: { executorId: "stub", executorVersion: "1", capability: "stub" } });
  assert.equal(stub.measurement.status, "not-collected");
  const missing = await evaluateBehaviorCase(behavior, agents, fixture, { executor });
  assert.equal(missing.measurement.status, "not-collected");
  const valid = await evaluateBehaviorCase(behavior, agents, fixture, { executor, descriptor: { executorId: "external", executorVersion: "1", capability: "genuine-agent-execution" } });
  assert.equal(valid.measurement.status, "collected");
  assert.equal(valid.passed, false);
});
