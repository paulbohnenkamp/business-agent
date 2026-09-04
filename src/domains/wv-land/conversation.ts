import type { CaseConversationPort, CaseConversationResponse, CaseConversationTurn } from "../../core/case-conversation";
import type { WvLandRunAggregate } from "./persistence";

export interface WvProductionState {
  readonly status: "no-match" | "reported-zero";
  readonly explanation: string;
}

export interface WvConversationState {
  readonly aggregate: WvLandRunAggregate;
  readonly production: WvProductionState;
}

/** Deterministic reference responder used by the offline demo. */
export class WvLocalConversation implements CaseConversationPort<WvConversationState> {
  async respond(request: { readonly caseId: string; readonly runId: string; readonly state: WvConversationState; readonly question: string; readonly history: readonly CaseConversationTurn[] }): Promise<CaseConversationResponse> {
    const { aggregate, production } = request.state;
    if (aggregate.caseId !== request.caseId || aggregate.runId !== request.runId) throw new Error("Conversation state identity does not match the request");
    const question = request.question.trim();
    if (question === "") return this.response("Ask about the current case findings, evidence, conflicts, unknowns, production, or review next steps.", "scope", "insufficient-context");
    const normalized = question.toLowerCase();
    const priorTopic = request.history.at(-1)?.topic;
    if (normalized.includes("evidence") && (normalized.includes("that") || normalized.includes("it")) && priorTopic === "operator-conflict") return this.operatorEvidence(aggregate);
    if (normalized.includes("operator") && (normalized.includes("agree") || normalized.includes("same") || normalized.includes("different"))) return this.operatorConflict(aggregate);
    if (normalized.includes("zero production") || normalized.includes("production") && normalized.includes("zero")) return this.production(aggregate, production);
    if (normalized.includes("mineral") && (normalized.includes("own") || normalized.includes("rights") || normalized.includes("title"))) return this.mineralTitle(aggregate);
    if (normalized.includes("still unknown") || normalized.includes("unknown")) return this.unknowns(aggregate);
    if (normalized.includes("review next") || normalized.includes("next") || normalized.includes("investigate")) return this.reviewNext(aggregate);
    if (normalized.includes("what did you find") || normalized.includes("findings") || normalized.includes("summary")) return this.findings(aggregate);
    return this.response("I can answer questions grounded in this case's structured findings, evidence, conflicts, unknowns, production result, and review packet. Try asking what was found, whether the operators agree, what evidence supports that, or what remains unknown.", "scope", "insufficient-context");
  }

  private findings(aggregate: WvLandRunAggregate): CaseConversationResponse {
    const findings = aggregate.result.findings;
    const summary = findings.map((item) => `${item.subject}: ${item.assertion}`).join(" ");
    return this.response(summary, "findings", "grounded", findings.flatMap((item) => item.evidenceIds), findings.map((item) => item.findingId), [], aggregate.result.unknowns.map((item) => item.unknownId));
  }

  private operatorConflict(aggregate: WvLandRunAggregate): CaseConversationResponse {
    const conflict = aggregate.result.conflicts.find((item) => item.subject === "operator");
    if (!conflict) return this.response("The current run contains no structured operator conflict.", "operator-conflict", "insufficient-context");
    const claims = conflict.claims.map((claim) => String(claim.value)).join("; ");
    return this.response(`No. WVDEP and WVGES do not report the same operator value in this case: ${claims}. The disagreement is preserved as an unresolved conflict; neither source is selected as authoritative.`, "operator-conflict", "grounded", conflict.claims.flatMap((claim) => claim.evidenceIds), [], [conflict.conflictId], []);
  }

  private operatorEvidence(aggregate: WvLandRunAggregate): CaseConversationResponse {
    const conflict = aggregate.result.conflicts.find((item) => item.subject === "operator");
    const refs = conflict?.claims.flatMap((claim) => claim.evidenceIds) ?? [];
    const records = refs.map((id) => aggregate.sourceEvidence.find((item) => item.evidenceId === id)).filter((item): item is WvLandRunAggregate["sourceEvidence"][number] => item !== undefined);
    const detail = records.map((item) => `${item.source.publisher} record ${item.sourceRecordId} reports ${String(item.normalizedFacts.operator ?? "no operator value")}`).join("; ");
    return this.response(`The operator conflict is supported by the exact records behind it: ${detail}. These are separate public-source observations, not a title or ownership determination.`, "operator-conflict", refs.length ? "grounded" : "insufficient-context", refs, [], conflict ? [conflict.conflictId] : [], []);
  }

  private production(aggregate: WvLandRunAggregate, production: WvProductionState): CaseConversationResponse {
    const finding = aggregate.result.findings.find((item) => item.subject === "production");
    const unknown = aggregate.result.unknowns.find((item) => item.subject === "production");
    const answer = production.status === "no-match" ? "No. The frozen production source has no matching record for this API. No matching production evidence is not the same as reported zero production; this case does not establish zero production." : "The structured production result is reported zero production, which is distinct from a source no-match.";
    return this.response(answer, "production", "grounded", [], finding ? [finding.findingId] : [], [], unknown ? [unknown.unknownId] : []);
  }

  private unknowns(aggregate: WvLandRunAggregate): CaseConversationResponse {
    const unknowns = aggregate.result.unknowns;
    return this.response(unknowns.map((item) => `${item.subject} remains unknown: ${item.question} ${item.reason}`).join(" "), "unknowns", "grounded", [], [], [], unknowns.map((item) => item.unknownId));
  }

  private mineralTitle(aggregate: WvLandRunAggregate): CaseConversationResponse {
    const unknown = aggregate.result.unknowns.find((item) => item.subject === "mineral title");
    return this.response("We do not know who owns the mineral rights from this evidence. WVDEP regulatory and WVGES geologic/public well records are not proof of mineral title or ownership. Appropriate county, deed, lease, or title evidence and human review would be required; I will not infer ownership from operator, farm, lease, well, or similar publisher fields.", "mineral-title", "grounded", [], [], [], unknown ? [unknown.unknownId] : []);
  }

  private reviewNext(aggregate: WvLandRunAggregate): CaseConversationResponse {
    return this.response(aggregate.result.synthesis?.synthesis ?? "Review the structured findings, preserved conflicts, and open unknowns before deciding the next investigation step. The current packet remains at human review.", "review-next", "grounded", aggregate.result.evidenceRefs.filter((id) => aggregate.evidenceIds.includes(id)), aggregate.result.findings.map((item) => item.findingId), aggregate.result.conflicts.map((item) => item.conflictId), aggregate.result.unknowns.map((item) => item.unknownId));
  }

  private response(answer: string, topic: string, grounding: CaseConversationResponse["grounding"], evidenceRefs: readonly string[] = [], findingRefs: readonly string[] = [], conflictRefs: readonly string[] = [], unknownRefs: readonly string[] = []): CaseConversationResponse { return { answer, topic, evidenceRefs, findingRefs, conflictRefs, unknownRefs, grounding, safety: "bounded" }; }
}
