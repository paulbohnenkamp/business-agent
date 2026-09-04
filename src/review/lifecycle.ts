import type { ReviewDecision, ReviewHistory, ReviewState } from "./contracts";

export function validateRevisionLineage(input: { readonly revisionOfRunId?: string; readonly revisionOfPacketId?: string }, prior: { readonly packetId: string; readonly state: ReviewState }): void {
  if (input.revisionOfRunId === undefined && input.revisionOfPacketId !== undefined) throw new Error("Revision packet reference requires a prior run");
  if (input.revisionOfRunId !== undefined && (input.revisionOfPacketId !== prior.packetId || prior.state !== "revision-requested")) throw new Error("Revision lineage requires the prior packet's revision request");
}

export function reviewState<TDecision extends ReviewDecision>(decisions: readonly TDecision[]): ReviewHistory<TDecision> {
  let state: ReviewState = "pending-human-review";
  const seen = new Set<string>();
  for (const decision of decisions) {
    if (seen.has(decision.decisionId)) throw new Error(`Duplicate review decision: ${decision.decisionId}`);
    if (state !== "pending-human-review") throw new Error(`Review packet is already ${state}`);
    if (decision.reviewerId.trim() === "" || decision.reason.trim() === "") throw new Error("Reviewer and reason are required");
    seen.add(decision.decisionId);
    state = decision.decision;
  }
  return { state, decisions: [...decisions] };
}
