/** Provider-neutral source and judgment contracts. They do not describe land facts. */
export type SourceMechanism = string;
export type FindingStatus = "supported" | "contradicted" | "inconclusive" | "unknown";
export type FindingConfidence = "high" | "medium" | "low" | "unknown";

export interface SourceIdentity {
  readonly id: string;
  readonly publisher: string;
  readonly dataset: string;
  readonly mechanism: SourceMechanism;
  readonly datasetVersion?: string;
  readonly authorityScope: string;
}

export interface SourceSnapshot {
  readonly snapshotId: string;
  readonly source: SourceIdentity;
  readonly requestUrl: string;
  readonly retrievedAt: string;
  readonly effectiveDate?: string;
  readonly publicationDate?: string;
  readonly contentType: string;
  readonly contentHash: string;
  readonly rawSnapshotRef: string;
  readonly byteLength: number;
  readonly parserVersion?: string;
  readonly immutable: true;
}

export interface SourceEvidence<TFacts> {
  readonly evidenceId: string;
  readonly snapshotId: string;
  readonly source: SourceIdentity;
  readonly sourceRecordId: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly effectiveDate?: string;
  readonly publicationDate?: string;
  readonly contentHash: string;
  readonly rawSnapshotRef: string;
  readonly normalizedFacts: TFacts;
  readonly warnings: readonly string[];
}

export interface Provenance {
  readonly runId: string;
  readonly stepId: string;
  readonly inputRecordIds: readonly string[];
  readonly sourceEvidenceIds: readonly string[];
  readonly producerVersion: string;
}

export interface Finding {
  readonly findingId: string;
  readonly caseId: string;
  readonly subject: string;
  readonly assertion: string;
  readonly status: FindingStatus;
  readonly confidence: FindingConfidence;
  readonly evidenceIds: readonly string[];
  readonly conflictIds: readonly string[];
  readonly unknownIds: readonly string[];
  readonly provenance: Provenance;
  readonly producer: string;
  readonly producedAt: string;
}
