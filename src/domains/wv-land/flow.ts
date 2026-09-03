import type { AgentDefinition } from "../../core/agents";
import { executeOrderedSteps, typedStep, type OrderedFlowExecution, type StepExecution, type TypedStep } from "../../core/typed-flow";
import { JsonBoundary } from "./json-boundary";
import { WvFactCodec } from "./fact-codec";
import { WvJudgmentCodec } from "./judgment-codec";
import { WvSourceCodec } from "./source-codec";
import type { ProductionAggregationResult } from "./tools/production";
import type { Conflict, Finding, SourceEvidence, SourceSnapshot, Unknown, WvProductionEvidence, WvWellEvidence } from "./contracts";

const judgmentCodec = new WvJudgmentCodec(new JsonBoundary());
const sourceCodec = new WvSourceCodec(new JsonBoundary(), new WvFactCodec(new JsonBoundary()));

export interface SubmittedLandPackage { readonly caseId: string; readonly synthetic: true; readonly clues: Readonly<Record<string, string | undefined>>; readonly claims: readonly string[]; readonly titleAssertion: null; }
export type WvEvidence = WvWellEvidence | WvProductionEvidence;
export interface EvidenceAcquisition { readonly sourceId: string; readonly required: boolean; readonly status: "succeeded" | "failed"; readonly evidenceIds: readonly string[]; readonly error?: string; }
export interface WvFlowInput { readonly caseId: string; readonly submittedPackage: SubmittedLandPackage; readonly sourceEvidence: readonly WvEvidence[]; readonly sourceSnapshots: readonly SourceSnapshot[]; readonly deterministicResults: readonly ProductionAggregationResult[]; readonly evidenceAcquisition: readonly EvidenceAcquisition[]; }
export interface AgentExecutionRequest<TInput> { readonly agent: AgentDefinition; readonly input: TInput; readonly evidence: readonly WvEvidence[]; readonly snapshots: readonly SourceSnapshot[]; readonly deterministicResults: readonly ProductionAggregationResult[]; }
export type AgentExecution<TOutput> = StepExecution<TOutput>;
export interface WvAgentExecutor { execute<TInput, TOutput>(request: AgentExecutionRequest<TInput>): Promise<AgentExecution<TOutput>>; }
export interface IntakeResult { readonly kind: "intake"; readonly caseId: string; readonly caseScope: "well-reconciliation" | "insufficient-scope"; readonly suppliedClues: Readonly<Record<string, string | undefined>>; readonly missingEvidence: readonly string[]; readonly ambiguousInputs: readonly string[]; readonly candidateQueries: readonly string[]; readonly route: "continue" | "request-records" | "human-review"; readonly evidenceIds: readonly string[]; }
export interface ReconciliationResult { readonly kind: "reconciliation"; readonly caseId: string; readonly findings: readonly Finding[]; readonly conflicts: readonly Conflict[]; readonly unknowns: readonly Unknown[]; readonly evidenceRefs: readonly string[]; readonly route: "continue" | "request-records" | "human-review"; }
export interface SynthesisResult { readonly kind: "synthesis"; readonly caseId: string; readonly findings: readonly Finding[]; readonly conflicts: readonly Conflict[]; readonly unknowns: readonly Unknown[]; readonly evidenceRefs: readonly string[]; readonly synthesis: string; readonly proposedRoute: "continue" | "request-records" | "human-review"; }
export interface WvFlowResult { readonly flowId: "wv-land-well-reconciliation"; readonly caseId: string; readonly status: "complete" | "incomplete" | "failed"; readonly steps: OrderedFlowExecution["steps"]; readonly findings: readonly Finding[]; readonly conflicts: readonly Conflict[]; readonly unknowns: readonly Unknown[]; readonly evidenceRefs: readonly string[]; readonly synthesis?: SynthesisResult; readonly executionFailure?: OrderedFlowExecution["failure"]; }

export function validateWvFlowInput(value: unknown): value is WvFlowInput {
  if (!isRecord(value) || typeof value.caseId !== "string" || !isSubmittedPackage(value.submittedPackage) || !Array.isArray(value.sourceEvidence) || !Array.isArray(value.sourceSnapshots) || !Array.isArray(value.deterministicResults) || !Array.isArray(value.evidenceAcquisition)) return false;
  return value.submittedPackage.caseId === value.caseId && value.sourceEvidence.every(isWvEvidence) && value.sourceSnapshots.every(isSnapshot) && value.evidenceAcquisition.every(isAcquisition);
}

export function validateWvFlowResult(value: unknown): value is WvFlowResult {
  if (!isRecord(value) || value.flowId !== "wv-land-well-reconciliation" || typeof value.caseId !== "string" || !["complete", "incomplete", "failed"].includes(value.status as string) || !Array.isArray(value.steps) || !Array.isArray(value.findings) || !Array.isArray(value.conflicts) || !Array.isArray(value.unknowns) || !isStringArray(value.evidenceRefs)) return false;
  if (!value.findings.every(isFinding) || !value.conflicts.every(isConflict) || !value.unknowns.every(isUnknown) || !value.findings.every((finding) => finding.caseId === value.caseId)) return false;
  if (value.synthesis !== undefined && (!validateSynthesis(value.synthesis) || value.synthesis.caseId !== value.caseId)) return false;
  if (value.status === "failed" && (value.executionFailure === undefined || value.synthesis !== undefined)) return false;
  if (value.status !== "failed" && value.executionFailure !== undefined) return false;
  if (value.executionFailure !== undefined && (!isRecord(value.executionFailure) || typeof value.executionFailure.stepId !== "string" || (value.executionFailure.kind !== "execution" && value.executionFailure.kind !== "validation") || typeof value.executionFailure.message !== "string")) return false;
  return value.steps.every(isStepRecord);
}

export function validateIntake(value: unknown): value is IntakeResult { return isRecord(value) && value.kind === "intake" && typeof value.caseId === "string" && (value.caseScope === "well-reconciliation" || value.caseScope === "insufficient-scope") && isStringRecord(value.suppliedClues) && isStringArray(value.missingEvidence) && isStringArray(value.ambiguousInputs) && isStringArray(value.candidateQueries) && isRoute(value.route) && isStringArray(value.evidenceIds); }
export function validateReconciliation(value: unknown): value is ReconciliationResult { return isRecord(value) && value.kind === "reconciliation" && typeof value.caseId === "string" && Array.isArray(value.findings) && Array.isArray(value.conflicts) && Array.isArray(value.unknowns) && value.findings.every(isFinding) && value.conflicts.every(isConflict) && value.unknowns.every(isUnknown) && isStringArray(value.evidenceRefs) && isRoute(value.route); }
export function validateSynthesis(value: unknown): value is SynthesisResult { return isRecord(value) && value.kind === "synthesis" && typeof value.caseId === "string" && Array.isArray(value.findings) && Array.isArray(value.conflicts) && Array.isArray(value.unknowns) && value.findings.every(isFinding) && value.conflicts.every(isConflict) && value.unknowns.every(isUnknown) && isStringArray(value.evidenceRefs) && typeof value.synthesis === "string" && isRoute(value.proposedRoute); }

export function flagshipSteps(agents: ReadonlyMap<string, AgentDefinition>, input: WvFlowInput, executor: WvAgentExecutor): readonly TypedStep[] {
  const agent = (id: string): AgentDefinition => { const definition = agents.get(id); if (!definition) throw new Error(`Missing canonical agent: ${id}`); return definition; };
  const intake = agent("land-case-intake"); const reconciler = agent("land-well-reconciler"); const synthesizer = agent("case-synthesizer");
  return [
    typedStep<WvFlowInput, IntakeResult>({ id: intake.id, required: true, validateInput: validateWvFlowInput, validateOutput: validateIntake, execute: (stepInput) => executor.execute({ agent: intake, input: stepInput, evidence: input.sourceEvidence, snapshots: input.sourceSnapshots, deterministicResults: input.deterministicResults }) }),
    typedStep<IntakeResult, ReconciliationResult>({ id: reconciler.id, required: true, validateInput: (value): value is IntakeResult => validateIntake(value) && value.caseId === input.caseId, validateOutput: (value): value is ReconciliationResult => validateReconciliation(value) && value.caseId === input.caseId && nestedFindingsBelongTo(value, input.caseId), execute: (stepInput) => executor.execute({ agent: reconciler, input: stepInput, evidence: input.sourceEvidence, snapshots: input.sourceSnapshots, deterministicResults: input.deterministicResults }) }),
    typedStep<ReconciliationResult, SynthesisResult>({ id: synthesizer.id, required: true, validateInput: (value): value is ReconciliationResult => validateReconciliation(value) && value.caseId === input.caseId && nestedFindingsBelongTo(value, input.caseId), validateOutput: (value): value is SynthesisResult => validateSynthesis(value) && value.caseId === input.caseId && nestedFindingsBelongTo(value, input.caseId), execute: (stepInput) => executor.execute({ agent: synthesizer, input: stepInput, evidence: input.sourceEvidence, snapshots: input.sourceSnapshots, deterministicResults: input.deterministicResults }) }),
  ];
}

export async function executeWvLandFlow(input: WvFlowInput, agents: ReadonlyMap<string, AgentDefinition>, executor: WvAgentExecutor): Promise<WvFlowResult> {
  if (!validateWvFlowInput(input)) throw new Error("Invalid WV land flow input");
  const acquisitionFailure = input.evidenceAcquisition.find((item) => item.required && item.status === "failed");
  if (acquisitionFailure !== undefined) return { flowId: "wv-land-well-reconciliation", caseId: input.caseId, status: "failed", steps: ["land-case-intake", "land-well-reconciler", "case-synthesizer"].map((stepId) => ({ status: "blocked", stepId, kind: "execution" as const, error: `Blocked by required evidence acquisition failure: ${acquisitionFailure.sourceId}` })), findings: [], conflicts: [], unknowns: [], evidenceRefs: [], executionFailure: { stepId: `evidence-acquisition:${acquisitionFailure.sourceId}`, kind: "execution", message: acquisitionFailure.error ?? "Required evidence acquisition failed" } };
  const execution = await executeOrderedSteps(input, flagshipSteps(agents, input, executor));
  const synthesis = execution.artifacts.find(isSynthesis);
  const reconciliation = execution.artifacts.find(isReconciliation);
  return { flowId: "wv-land-well-reconciliation", caseId: input.caseId, status: execution.status === "succeeded" ? "complete" : "failed", steps: execution.steps, findings: synthesis?.findings ?? reconciliation?.findings ?? [], conflicts: synthesis?.conflicts ?? reconciliation?.conflicts ?? [], unknowns: synthesis?.unknowns ?? reconciliation?.unknowns ?? [], evidenceRefs: synthesis?.evidenceRefs ?? reconciliation?.evidenceRefs ?? [], ...(synthesis === undefined ? {} : { synthesis }), ...(execution.failure === undefined ? {} : { executionFailure: execution.failure }) };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isStringArray(value: unknown): value is readonly string[] { return Array.isArray(value) && value.every((item) => typeof item === "string"); }
function isStringRecord(value: unknown): value is Readonly<Record<string, string | undefined>> { return isRecord(value) && Object.values(value).every((item) => item === undefined || typeof item === "string"); }
function isRoute(value: unknown): value is IntakeResult["route"] { return value === "continue" || value === "request-records" || value === "human-review"; }
function isSubmittedPackage(value: unknown): value is SubmittedLandPackage { return isRecord(value) && typeof value.caseId === "string" && value.synthetic === true && isStringRecord(value.clues) && isStringArray(value.claims) && value.titleAssertion === null; }
function isSnapshot(value: unknown): value is SourceSnapshot { try { if (!isRecord(value)) return false; const serialized = JSON.stringify(value); if (serialized === undefined) return false; sourceCodec.decodeSnapshot(serialized); return true; } catch { return false; } }
function isWvEvidence(value: unknown): value is WvEvidence { try { if (!isRecord(value) || !isRecord(value.normalizedFacts)) return false; const serialized = JSON.stringify(value); if (serialized === undefined) return false; if ("productionRecordId" in value.normalizedFacts) sourceCodec.decodeProductionEvidence(serialized); else sourceCodec.decodeWellEvidence(serialized); return true; } catch { return false; } }
function isAcquisition(value: unknown): value is EvidenceAcquisition { return isRecord(value) && typeof value.sourceId === "string" && typeof value.required === "boolean" && (value.status === "succeeded" || value.status === "failed") && isStringArray(value.evidenceIds) && (value.error === undefined || typeof value.error === "string"); }
function isStepRecord(value: unknown): value is OrderedFlowExecution["steps"][number] {
  if (!isRecord(value) || typeof value.stepId !== "string" || !["succeeded", "failed", "blocked"].includes(value.status as string)) return false;
  if (value.status === "succeeded") return Object.prototype.hasOwnProperty.call(value, "artifact");
  return (value.kind === "execution" || value.kind === "validation") && typeof value.error === "string";
}
function isFinding(value: unknown): value is Finding { try { if (!isRecord(value)) return false; const serialized = JSON.stringify(value); if (serialized === undefined) return false; judgmentCodec.decodeFinding(serialized); return true; } catch { return false; } }
function isConflict(value: unknown): value is Conflict { try { if (!isRecord(value)) return false; const serialized = JSON.stringify(value); if (serialized === undefined) return false; judgmentCodec.decodeConflict(serialized); return true; } catch { return false; } }
function isUnknown(value: unknown): value is Unknown { try { if (!isRecord(value)) return false; const serialized = JSON.stringify(value); if (serialized === undefined) return false; judgmentCodec.decodeUnknown(serialized); return true; } catch { return false; } }
function nestedFindingsBelongTo(value: ReconciliationResult | SynthesisResult, caseId: string): boolean { return value.findings.every((finding) => finding.caseId === caseId); }
function isIntake(value: unknown): value is IntakeResult { return validateIntake(value); }
function isReconciliation(value: unknown): value is ReconciliationResult { return validateReconciliation(value); }
function isSynthesis(value: unknown): value is SynthesisResult { return validateSynthesis(value); }
