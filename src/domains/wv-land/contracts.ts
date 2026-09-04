/**
 * Immutable, serializable contracts for the West Virginia land flagship.
 *
 * These records are deliberately outside `src/core`: the runtime stays
 * jurisdiction-neutral while the flagship owns its source vocabulary and
 * normalized well and production facts. Public-source evidence is provenance,
 * not a title determination.
 */

import type { Finding, FindingConfidence, FindingStatus, Provenance, SourceEvidence, SourceIdentity, SourceMechanism, SourceSnapshot } from "../../evidence/contracts";
export type { Finding, FindingConfidence, FindingStatus, Provenance, SourceEvidence, SourceIdentity, SourceMechanism, SourceSnapshot } from "../../evidence/contracts";
export type ConflictStatus = "unresolved" | "resolved-by-review";

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
  /** Publisher-specific row label such as WVGES Original Location or Plugging. */
  readonly sourceRecordType?: string;
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
