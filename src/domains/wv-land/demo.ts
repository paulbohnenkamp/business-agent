import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { loadAgents } from "../../core/agents";
import type { Conflict, Finding, SourceEvidence, SourceSnapshot, Unknown, WvWellEvidence } from "./contracts";
import { executeWvLandFlow, type AgentExecutionRequest, type IntakeResult, type ReconciliationResult, type SubmittedLandPackage, type SynthesisResult, type WvAgentExecutor, type WvFlowInput } from "./flow";
import { FileWvLandRunStore, type WvLandRunAggregate } from "./persistence";
import { toLandProductionLookup, toLandWell } from "./projections";
import type { ProductionAggregationResult } from "./tools/production";
import { WvLandJsonCodec } from "./serialization";
import { loadWvFixture } from "../../evaluations/wv-land";
import { WvLocalConversation, type WvProductionState } from "./conversation";
import type { CaseConversationResponse, CaseConversationTurn } from "../../core/case-conversation";

export const DEMO_CASE_ID = "synthetic-wv-case-braxton-001";
export const DEMO_FIXTURE_ID = "braxton-4700701733";

export interface DemoCase {
  readonly caseId: string;
  readonly fixtureId: string;
  readonly submittedPackage: SubmittedLandPackage;
  readonly snapshots: readonly SourceSnapshot[];
  readonly evidence: readonly SourceEvidence<unknown>[];
  readonly production: { readonly status: "no-match"; readonly explanation: string };
  readonly titleBoundary: string;
}

export function demoWorkspace(environment: Readonly<Record<string, string | undefined>> = process.env): string {
  return resolve(environment.BUSINESS_AGENT_WORKSPACE?.trim() || join("/tmp", "business-agent-demo"));
}

export async function loadDemoCase(): Promise<DemoCase> {
  const fixture = await loadWvFixture(resolve("fixtures/wv-land/braxton-4700701733"));
  const codec = new WvLandJsonCodec();
  const snapshots = fixture.snapshots.map((snapshot) => codec.decodeSourceSnapshot(JSON.stringify(snapshot)));
  const evidence = fixture.evidence.map((item) => codec.decodeWellEvidence(JSON.stringify(item))) as readonly SourceEvidence<unknown>[];
  const submittedPackage = JSON.parse(JSON.stringify(fixture.input)) as SubmittedLandPackage;
  const production = fixture.production;
  if (production.resultType !== "no-match" || production.apiNumberQueried !== "4700701733" || production.records.length !== 0) throw new Error("Demo production fixture is not the expected no-match case");
  return { caseId: submittedPackage.caseId, fixtureId: DEMO_FIXTURE_ID, submittedPackage, snapshots, evidence, production: { status: "no-match", explanation: "The frozen 2025 WVDEP workbook contains no row for API 4700701733. This is no matching production evidence, not reported zero production." }, titleBoundary: "WVDEP and WVGES public regulatory records are not proof of mineral title." };
}

function sourceEvidenceFor(caseData: DemoCase): readonly WvWellEvidence[] {
  return caseData.evidence as readonly WvWellEvidence[];
}

function inputFor(caseData: DemoCase): WvFlowInput {
  const evidence = sourceEvidenceFor(caseData);
  const noEvidence: ProductionAggregationResult = { status: "no-evidence", aggregates: [], evidenceIds: [], reason: caseData.production.explanation };
  return { caseId: caseData.caseId, submittedPackage: caseData.submittedPackage, sourceEvidence: evidence, sourceSnapshots: caseData.snapshots, landWells: evidence.map(toLandWell), productionLookups: [toLandProductionLookup(noEvidence)], deterministicResults: [noEvidence], evidenceAcquisition: [
    { sourceId: "wvdep-oog-rbdms-wells", required: true, status: "succeeded", evidenceIds: evidence.filter((item) => item.source.id === "wvdep-oog-rbdms-wells").map((item) => item.evidenceId) },
    { sourceId: "wvges-oilgas-wells", required: true, status: "succeeded", evidenceIds: evidence.filter((item) => item.source.id === "wvges-oilgas-wells").map((item) => item.evidenceId) },
    { sourceId: "wvdep-annual-production", required: true, status: "succeeded", evidenceIds: [] },
  ] };
}

function localExecutor(runId: string, caseData: DemoCase): WvAgentExecutor {
  const evidence = sourceEvidenceFor(caseData);
  const dep = evidence.find((item) => item.source.id === "wvdep-oog-rbdms-wells" && item.sourceRecordId === "objectid:100001")!;
  const ges = evidence.find((item) => item.source.id === "wvges-oilgas-wells" && item.sourceRecordId === "OBJECTID:21403260")!;
  const evidenceRefs = [...evidence.map((item) => item.evidenceId), ...caseData.snapshots.map((item) => item.snapshotId)];
  const conflict: Conflict = { conflictId: `conflict-${runId}-operator`, subject: "operator", claims: [{ value: dep.normalizedFacts.operator, evidenceIds: [dep.evidenceId] }, { value: ges.normalizedFacts.operator, evidenceIds: [ges.evidenceId] }], reason: "Independent WVDEP and WVGES records report different operator values; neither publisher is silently preferred.", status: "unresolved", createdAt: new Date().toISOString() };
  const unknowns: Unknown[] = [
    { unknownId: `unknown-${runId}-production`, subject: "production", question: "Was production reported for API 4700701733?", reason: caseData.production.explanation, neededEvidence: ["production record"], createdAt: new Date().toISOString() },
    { unknownId: `unknown-${runId}-title`, subject: "mineral title", question: "Who owns the minerals under the submitted tract?", reason: caseData.titleBoundary, neededEvidence: ["county deed records", "title opinion"], createdAt: new Date().toISOString() },
  ];
  const provenance = (stepId: string, inputRecordIds: readonly string[]): Finding["provenance"] => ({ runId, stepId, inputRecordIds, sourceEvidenceIds: evidenceRefs.filter((id) => evidence.some((item) => item.evidenceId === id)), producerVersion: "local-fixture-executor@1.0.0" });
  const finding = (subject: string, assertion: string, status: Finding["status"], confidence: Finding["confidence"], ids: readonly string[], conflictIds: readonly string[], unknownIds: readonly string[], inputs: readonly string[]): Finding => ({ findingId: `finding-${runId}-${subject.replace(/[^a-z0-9]+/gi, "-")}`, caseId: caseData.caseId, subject, assertion, status, confidence, evidenceIds: ids, conflictIds, unknownIds, provenance: provenance("land-well-reconciler", inputs), producer: "local-fixture-executor", producedAt: new Date().toISOString() });
  const findings = [
    finding("well identity", "The submitted API, county, and well-number clues match the frozen WV public well evidence.", "supported", "high", evidence.map((item) => item.evidenceId), [], [], [caseData.caseId, dep.sourceRecordId, ges.sourceRecordId]),
    finding("operator", "The operator is inconclusive because WVDEP and WVGES report different values.", "inconclusive", "medium", [dep.evidenceId, ges.evidenceId], [conflict.conflictId], [], [dep.sourceRecordId, ges.sourceRecordId]),
    finding("production", "No matching production evidence was found in the frozen 2025 workbook; that does not establish reported zero production.", "unknown", "unknown", [], [], [unknowns[0]!.unknownId], [caseData.caseId]),
  ];
  return { async execute<TInput, TOutput>(request: AgentExecutionRequest<TInput>) {
    if (request.agent.id === "land-case-intake") return { status: "succeeded", artifact: { kind: "intake", caseId: caseData.caseId, caseScope: "well-reconciliation", suppliedClues: caseData.submittedPackage.clues, missingEvidence: [], ambiguousInputs: [], candidateQueries: ["api:4700701733"], route: "continue", evidenceIds: evidence.map((item) => item.evidenceId) } as IntakeResult as TOutput };
    const reconciliation: ReconciliationResult = { kind: "reconciliation", caseId: caseData.caseId, findings, conflicts: [conflict], unknowns, evidenceRefs, route: "human-review" };
    if (request.agent.id === "land-well-reconciler") return { status: "succeeded", artifact: reconciliation as TOutput };
    const synthesis: SynthesisResult = { kind: "synthesis", caseId: caseData.caseId, findings, conflicts: [conflict], unknowns, evidenceRefs, synthesis: "The submitted API is supported by matching WVDEP and WVGES well records. Operator history remains unresolved across independent sources, production is a no-match rather than reported zero, and mineral title remains outside this public-evidence workflow. Human review should inspect the source records and obtain county/title evidence before any consequential decision.", proposedRoute: "human-review" };
    return { status: "succeeded", artifact: synthesis as TOutput };
  } };
}

export async function runDemo(): Promise<WvLandRunAggregate> {
  const caseData = await loadDemoCase();
  const agents = await loadAgents(resolve("domains/land-administration"));
  const runId = `demo-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const result = await executeWvLandFlow(inputFor(caseData), agents, localExecutor(runId, caseData));
  const now = new Date().toISOString();
  return new FileWvLandRunStore(demoWorkspace()).saveRun({ runId, flowVersion: "1.0.0", startedAt: now, completedAt: now, submittedPackage: caseData.submittedPackage, sourceSnapshots: caseData.snapshots, sourceEvidence: sourceEvidenceFor(caseData), result });
}

export async function getDemoRun(runId: string): Promise<WvLandRunAggregate> {
  return new FileWvLandRunStore(demoWorkspace()).getRun(DEMO_CASE_ID, runId);
}

export async function getDemoReview(runId: string) {
  return new FileWvLandRunStore(demoWorkspace()).getReviewPacket(DEMO_CASE_ID, runId);
}

export async function decideDemoReview(runId: string, decision: "approved" | "rejected" | "revision-requested", reviewerId: string, reason: string) {
  return new FileWvLandRunStore(demoWorkspace()).recordReviewDecision(DEMO_CASE_ID, runId, { decisionId: `decision-${Date.now()}-${randomUUID().slice(0, 8)}`, reviewerId, decision, reason, decidedAt: new Date().toISOString() });
}

export async function askDemo(runId: string, question: string, history: readonly CaseConversationTurn[] = []): Promise<CaseConversationResponse> {
  const [aggregate, caseData] = await Promise.all([getDemoRun(runId), loadDemoCase()]);
  const production: WvProductionState = caseData.production;
  return new WvLocalConversation().respond({ caseId: DEMO_CASE_ID, runId, state: { aggregate, production }, question, history });
}
