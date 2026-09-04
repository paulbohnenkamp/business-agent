/** Shared evaluation vocabulary. Domain suites add their own case semantics. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { readonly [key: string]: JsonValue };
export type EvaluationExecutionKind = "deterministic-fixture" | "harness-validation" | "agent-behavior" | "flagship-flow-behavior";
export type CheckOutcome = "pass" | "fail" | "info";
export interface EvaluationCheck { readonly id: string; readonly outcome: CheckOutcome; readonly hardGate: boolean; readonly detail?: string; }
export type BehavioralMeasurement =
  | { readonly status: "not-applicable" }
  | { readonly status: "not-collected"; readonly reason: "no-genuine-executor" | "missing-authenticity-metadata" | "untrusted-executor-kind" }
  | { readonly status: "collected"; readonly executorId: string; readonly executorVersion: string; readonly capability: "genuine-agent-execution" }
  | { readonly status: "failed"; readonly executorId: string; readonly executorVersion: string; readonly reason: string };
export interface BehavioralExecutorDescriptor { readonly executorId: string; readonly executorVersion: string; readonly capability: "genuine-agent-execution" | "predefined-replay" | "stub"; }
export interface EvaluationResult<TKind extends string = EvaluationExecutionKind> { readonly caseId: string; readonly executionKind: TKind; readonly passed: boolean | null; readonly measurement: BehavioralMeasurement; readonly checks: readonly EvaluationCheck[]; readonly hardFailures: readonly string[]; readonly diagnosticScore?: number | null; }
export function check(id: string, passed: boolean, hardGate: boolean, detail: string): EvaluationCheck { return { id, outcome: passed ? "pass" : "fail", hardGate, detail }; }
export function diagnostic(error: unknown): string { return error instanceof Error ? error.message : String(error); }
export function gradeResult<TKind extends string>(caseId: string, executionKind: TKind, checks: readonly EvaluationCheck[], measurement: BehavioralMeasurement): EvaluationResult<TKind> {
  const hardFailures = checks.filter((item) => item.hardGate && item.outcome === "fail").map((item) => item.id);
  const graded = checks.filter((item) => item.outcome !== "info");
  const diagnosticScore = measurement.status === "not-collected" || measurement.status === "failed" || graded.length === 0 ? null : graded.filter((item) => item.outcome === "pass").length / graded.length;
  const passed = measurement.status === "not-collected" ? null : measurement.status === "failed" ? false : hardFailures.length === 0;
  return { caseId, executionKind, passed, measurement, checks, hardFailures, diagnosticScore };
}
