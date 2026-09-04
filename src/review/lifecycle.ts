import type { ReviewDecision, ReviewHistory, ReviewState } from "./contracts";

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
