/** Scope is inherited from the containing aggregate; children do not duplicate it. */
export interface JudgmentScope { readonly caseId: string; readonly runId: string; }
export type ConflictStatus = "unresolved" | "resolved-by-review";
export interface Conflict {
  readonly conflictId: string;
  readonly subject: string;
  readonly claims: readonly { readonly value: unknown; readonly evidenceIds: readonly string[] }[];
  readonly reason: string;
  readonly status: ConflictStatus;
  readonly createdAt: string;
}
export interface Unknown {
  readonly unknownId: string;
  readonly subject: string;
  readonly question: string;
  readonly reason: string;
  readonly neededEvidence?: readonly string[];
  readonly createdAt: string;
}
export interface ScopedJudgments<TConflict = Conflict, TUnknown = Unknown> {
  readonly scope: JudgmentScope;
  readonly conflicts: readonly TConflict[];
  readonly unknowns: readonly TUnknown[];
}

export function createScopedJudgments<TConflict, TUnknown>(scope: JudgmentScope, conflicts: readonly TConflict[], unknowns: readonly TUnknown[]): ScopedJudgments<TConflict, TUnknown> {
  if (scope.caseId.trim() === "" || scope.runId.trim() === "") throw new Error("Judgment scope requires case and run IDs");
  return { scope, conflicts: [...conflicts], unknowns: [...unknowns] };
}

export function validateScopedJudgments<TConflict, TUnknown>(value: ScopedJudgments<TConflict, TUnknown>, expected: JudgmentScope): void {
  if (value.scope.caseId !== expected.caseId || value.scope.runId !== expected.runId) throw new Error("Judgment scope does not match its containing aggregate");
}
