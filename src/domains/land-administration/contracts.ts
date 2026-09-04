import type { JsonValue, SourceEvidence } from "../../evidence/contracts";

export interface IdentifierReference {
  readonly kind: string;
  readonly value: string;
  readonly jurisdiction: string;
  readonly publisher: string;
  readonly sourceRecordId: string;
}

export interface Coordinate {
  readonly role: "surface" | "bottom-hole";
  readonly latitude: number;
  readonly longitude: number;
  readonly crs?: string;
  readonly datum?: string;
  readonly precision?: string;
}

/** The smallest well projection consumed by shared land workflows. */
export interface LandWell {
  readonly wellId: string;
  readonly identifiers: readonly IdentifierReference[];
  readonly county?: string;
  readonly surfaceLocation?: Coordinate;
  readonly nameOrNumber?: string;
  readonly operator?: string;
  readonly status?: string;
  readonly wellType?: string;
  readonly issuedDate?: string;
  readonly completedDate?: string;
  readonly evidenceIds: readonly string[];
  readonly extensions?: Readonly<Record<string, JsonValue>>;
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
  readonly extensions?: Readonly<Record<string, JsonValue>>;
}
export type LandProductionEvidence = SourceEvidence<LandProductionRecord>;

export type LandProductionLookup =
  | { readonly status: "no-match"; readonly records: readonly []; readonly evidenceIds: readonly string[]; readonly reason: string }
  | { readonly status: "reported"; readonly records: readonly LandProductionRecord[]; readonly evidenceIds: readonly string[] };

export function noProductionMatch(reason: string, evidenceIds: readonly string[] = []): LandProductionLookup {
  return { status: "no-match", records: [], evidenceIds: [...evidenceIds], reason };
}

export function reportedProduction(records: readonly LandProductionRecord[], evidenceIds: readonly string[]): LandProductionLookup {
  if (records.length === 0) throw new Error("Reported production requires at least one record");
  return { status: "reported", records: [...records], evidenceIds: [...evidenceIds] };
}
