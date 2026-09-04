import type { SourceEvidence } from "../../evidence/contracts";

/** The smallest well projection consumed by shared land workflows. */
export interface LandWell {
  readonly wellId: string;
  readonly identifiers: Readonly<Record<string, string>>;
  readonly county?: string;
  readonly surfaceLocation?: { readonly latitude: number; readonly longitude: number; readonly datum?: string };
  readonly nameOrNumber?: string;
  readonly operator?: string;
  readonly status?: string;
  readonly wellType?: string;
  readonly issuedDate?: string;
  readonly completedDate?: string;
  readonly evidenceIds: readonly string[];
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export type LandWellEvidence = SourceEvidence<LandWell>;

export type ProductionMatchStatus = "reported" | "no-match";
export interface LandProductionRecord {
  readonly productionRecordId: string;
  readonly wellId: string;
  readonly period: { readonly year: number; readonly month?: number };
  readonly value: number;
  readonly unit: string;
  readonly matchStatus: ProductionMatchStatus;
  readonly evidenceId: string;
  readonly extensions?: Readonly<Record<string, unknown>>;
}
export type LandProductionEvidence = SourceEvidence<LandProductionRecord>;
