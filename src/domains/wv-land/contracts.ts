/**
 * Immutable, serializable contracts for the West Virginia land flagship.
 *
 * These records are deliberately outside `src/core`: the runtime stays
 * jurisdiction-neutral while the flagship owns its source vocabulary and
 * normalized well and production facts. Public-source evidence is provenance,
 * not a title determination.
 */

export type SourceMechanism = "arcgis-rest" | "xlsx-download";
/** Finding outcomes distinguish direct support, contradiction, unresolved comparison, and evidence absence. */
export type FindingStatus = "supported" | "contradicted" | "inconclusive" | "unknown";
export type FindingConfidence = "high" | "medium" | "low" | "unknown";
export type ConflictStatus = "unresolved" | "resolved-by-review";

/** Identifies a published dataset, not one retrieval from that dataset. */
export interface SourceIdentity {
  readonly id: string;
  readonly publisher: string;
  readonly dataset: string;
  readonly mechanism: SourceMechanism;
  readonly datasetVersion?: string;
  readonly authorityScope: string;
}

/**
 * Describes one immutable byte-level retrieval. A refresh creates a new
 * snapshot even when its normalized facts happen to be unchanged. The
 * `immutable` marker and decoded runtime freezing protect metadata in memory;
 * write-once raw-byte storage is a later retrieval/persistence responsibility.
 */
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

/** One normalized source record linked to the exact snapshot that produced it. */
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

/** Links a judgment to the run, step, records, evidence, and producer version. */
export interface Provenance {
  readonly runId: string;
  readonly stepId: string;
  readonly inputRecordIds: readonly string[];
  readonly sourceEvidenceIds: readonly string[];
  readonly producerVersion: string;
}

/**
 * Durable business state; Markdown agent output is only its presentation.
 * Supported and contradicted findings require direct evidence. Inconclusive
 * findings may instead point to conflicts or unknowns; unknown findings may
 * have no direct evidence.
 */
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

/** Preserves competing claims instead of silently selecting one source. */
export interface Conflict {
  readonly conflictId: string;
  readonly subject: string;
  readonly claims: readonly {
    readonly value: unknown;
    readonly evidenceIds: readonly string[];
  }[];
  readonly reason: string;
  readonly status: ConflictStatus;
  readonly createdAt: string;
}

/** Records a question the available evidence cannot answer without inventing a fact. */
export interface Unknown {
  readonly unknownId: string;
  readonly subject: string;
  readonly question: string;
  readonly reason: string;
  readonly neededEvidence?: readonly string[];
  readonly createdAt: string;
}

/** Normalized well facts; public well evidence is not proof of mineral title. */
export interface Well {
  readonly apiNumber: string;
  readonly permitId?: string;
  readonly county?: string;
  readonly surfaceLocation?: {
    readonly latitude: number;
    readonly longitude: number;
    readonly datum?: string;
  };
  readonly wellNumber?: string;
  readonly farmOrLeaseName?: string;
  readonly leaseNumber?: string;
  readonly operator?: string;
  readonly operatorAtCompletion?: string;
  readonly status?: string;
  readonly wellType?: string;
  readonly formation?: string;
  readonly measuredDepth?: number;
  readonly trueVerticalDepth?: number;
  readonly issuedDate?: string;
  readonly completedDate?: string;
  readonly productionEvidenceIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

/** A production value for one API and reporting period, retaining its units. Zero is a reported value; absence means not reported. */
export interface ProductionRecord {
  readonly productionRecordId: string;
  readonly apiNumber: string;
  readonly period: { readonly year: number; readonly month?: number };
  readonly gasMcf?: number;
  readonly oilBarrels?: number;
  readonly condensateBarrels?: number;
  readonly waterBarrels?: number;
  readonly operator?: string;
  readonly evidenceId: string;
}

export type WvWellEvidence = SourceEvidence<Well>;
export type WvProductionEvidence = SourceEvidence<ProductionRecord>;

/** Every record supported by the Phase 1 persistence boundary. */
export type WvLandRecord =
  | SourceIdentity
  | SourceSnapshot
  | WvWellEvidence
  | WvProductionEvidence
  | Finding
  | Conflict
  | Unknown
  | Well
  | ProductionRecord;
