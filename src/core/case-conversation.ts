/** Small provider-neutral boundary for asking questions about a structured case. */
export interface CaseConversationTurn {
  readonly question: string;
  readonly topic: string;
}

export interface CaseConversationResponse {
  readonly answer: string;
  readonly topic: string;
  readonly evidenceRefs: readonly string[];
  readonly findingRefs: readonly string[];
  readonly conflictRefs: readonly string[];
  readonly unknownRefs: readonly string[];
  readonly grounding: "grounded" | "insufficient-context";
  readonly safety: "bounded";
}

export interface CaseConversationPort<TState> {
  respond(request: {
    readonly caseId: string;
    readonly runId: string;
    readonly state: TState;
    readonly question: string;
    readonly history: readonly CaseConversationTurn[];
  }): Promise<CaseConversationResponse>;
}
