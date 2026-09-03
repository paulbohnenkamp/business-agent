import type { Conflict, Finding, Provenance, Unknown } from "./contracts";
import { JsonBoundary } from "./json-boundary";

/** Validates durable findings, conflicts, unknowns, and their provenance links. */
export class WvJudgmentCodec {
  constructor(private readonly json: JsonBoundary) {}

  encodeFinding(value: Finding): string { return this.json.encode(value, "finding", (input) => this.readFinding(input)); }
  decodeFinding(serialized: string): Finding { return this.json.deepFreeze(this.json.decode(serialized, "finding", (input) => this.readFinding(input))); }
  encodeConflict(value: Conflict): string { return this.json.encode(value, "conflict", (input) => this.readConflict(input)); }
  decodeConflict(serialized: string): Conflict { return this.json.deepFreeze(this.json.decode(serialized, "conflict", (input) => this.readConflict(input))); }
  encodeUnknown(value: Unknown): string { return this.json.encode(value, "unknown", (input) => this.readUnknown(input)); }
  decodeUnknown(serialized: string): Unknown { return this.json.deepFreeze(this.json.decode(serialized, "unknown", (input) => this.readUnknown(input))); }

  private readFinding(value: unknown): Finding {
    const object = this.json.object(value);
    const status = this.json.enumValue(object, "status", ["supported", "contradicted", "inconclusive", "unknown"]);
    const evidenceIds = this.json.stringArray(object, "evidenceIds");
    const conflictIds = this.json.stringArray(object, "conflictIds");
    const unknownIds = this.json.stringArray(object, "unknownIds");
    if ((status === "supported" || status === "contradicted") && evidenceIds.length === 0) throw new Error(`${status} findings require direct evidenceIds`);
    if (status === "inconclusive" && evidenceIds.length === 0 && conflictIds.length === 0 && unknownIds.length === 0) throw new Error("inconclusive findings require direct evidenceIds, conflictIds, or unknownIds");
    return { findingId: this.json.string(object, "findingId"), caseId: this.json.string(object, "caseId"), subject: this.json.string(object, "subject"), assertion: this.json.string(object, "assertion"), status, confidence: this.json.enumValue(object, "confidence", ["high", "medium", "low", "unknown"]), evidenceIds, conflictIds, unknownIds, provenance: this.readProvenance(object.provenance), producer: this.json.string(object, "producer"), producedAt: this.json.timestamp(object, "producedAt") };
  }

  private readConflict(value: unknown): Conflict {
    const object = this.json.object(value);
    const claimsValue = object.claims;
    if (!Array.isArray(claimsValue) || claimsValue.length < 2) throw new Error("claims must contain at least two competing claims");
    const claims = claimsValue.map((claim, index) => {
      const claimObject = this.json.object(claim);
      const evidenceIds = this.json.stringArray(claimObject, "evidenceIds");
      if (evidenceIds.length === 0) throw new Error(`claims[${index}].evidenceIds must not be empty`);
      return { value: this.json.jsonValue(claimObject.value, `claims[${index}].value`), evidenceIds };
    });
    return { conflictId: this.json.string(object, "conflictId"), subject: this.json.string(object, "subject"), claims, reason: this.json.string(object, "reason"), status: this.json.enumValue(object, "status", ["unresolved", "resolved-by-review"]), createdAt: this.json.timestamp(object, "createdAt") };
  }

  private readUnknown(value: unknown): Unknown {
    const object = this.json.object(value);
    const neededEvidence = object.neededEvidence === undefined ? undefined : this.json.stringArray(object, "neededEvidence");
    return { unknownId: this.json.string(object, "unknownId"), subject: this.json.string(object, "subject"), question: this.json.string(object, "question"), reason: this.json.string(object, "reason"), ...(neededEvidence === undefined ? {} : { neededEvidence }), createdAt: this.json.timestamp(object, "createdAt") };
  }

  private readProvenance(value: unknown): Provenance {
    const object = this.json.object(value);
    return { runId: this.json.string(object, "runId"), stepId: this.json.string(object, "stepId"), inputRecordIds: this.json.stringArray(object, "inputRecordIds"), sourceEvidenceIds: this.json.stringArray(object, "sourceEvidenceIds"), producerVersion: this.json.string(object, "producerVersion") };
  }
}
