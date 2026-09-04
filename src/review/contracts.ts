/** Domain-neutral review lifecycle contracts. Domain routes stay in packets. */
export type ReviewState = "pending-human-review" | "approved" | "rejected" | "revision-requested";
export type ReviewDecisionKind = Exclude<ReviewState, "pending-human-review">;

export interface ReviewDecision<TPacketId extends string = string> {
  readonly decisionId: string;
  readonly reviewPacketId: TPacketId;
  readonly reviewerId: string;
  readonly decision: ReviewDecisionKind;
  readonly reason: string;
  readonly decidedAt: string;
  readonly revisesPacketId?: TPacketId;
}

export interface ReviewHistory<TDecision extends ReviewDecision = ReviewDecision> {
  readonly state: ReviewState;
  readonly decisions: readonly TDecision[];
}
