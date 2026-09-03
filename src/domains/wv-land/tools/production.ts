import type { ProductionRecord, WvProductionEvidence } from "../contracts";

export interface AggregatedProduction {
  readonly apiNumber: string;
  readonly period: { readonly year: number; readonly month?: number };
  readonly gasMcf?: number;
  readonly oilBarrels?: number;
  readonly condensateBarrels?: number;
  readonly waterBarrels?: number;
  readonly evidenceIds: readonly string[];
  readonly recordCount: number;
}

export type ProductionAggregationResult =
  | { readonly status: "aggregated"; readonly aggregates: readonly AggregatedProduction[]; readonly evidenceIds: readonly string[] }
  | { readonly status: "no-evidence"; readonly aggregates: readonly []; readonly evidenceIds: readonly []; readonly reason: string }
  | { readonly status: "incompatible"; readonly aggregates: readonly []; readonly evidenceIds: readonly string[]; readonly reason: string }
  | { readonly status: "invalid-input"; readonly aggregates: readonly []; readonly evidenceIds: readonly string[]; readonly reason: string };

/**
 * Aggregates compatible publisher evidence by API and period.
 *
 * A successful result requires one valid evidence record per non-overlapping
 * API period from one source identity. This tool does not decide which source
 * is correct or whether distinct records are additive; it reports those cases
 * as incompatibility for later judgment.
 */
export function aggregateProduction(records: readonly WvProductionEvidence[]): ProductionAggregationResult {
  if (records.length === 0) return { status: "no-evidence", aggregates: [], evidenceIds: [], reason: "No production evidence matched the query." };
  const evidenceIds = records.map((evidence) => evidence.evidenceId);
  try {
    validateEvidence(records);
  } catch (error) {
    return { status: "invalid-input", aggregates: [], evidenceIds, reason: error instanceof Error ? error.message : String(error) };
  }
  const sourceKey = sourceIdentityKey(records[0]);
  if (records.some((evidence) => sourceIdentityKey(evidence) !== sourceKey)) return incompatible(evidenceIds, "Production evidence comes from incompatible source identities; no publisher was selected.");
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex].normalizedFacts;
      const right = records[rightIndex].normalizedFacts;
      if (left.apiNumber !== right.apiNumber) continue;
      if (records[leftIndex].evidenceId === records[rightIndex].evidenceId || JSON.stringify(left) === JSON.stringify(right)) return incompatible(evidenceIds, "Duplicate production evidence cannot be counted twice.");
      if (periodsOverlap(left.period, right.period)) return incompatible(evidenceIds, "Distinct production evidence overlaps the same API period and is not established as additive.");
    }
  }
  const aggregates = records.map((evidence) => toAggregate(evidence.normalizedFacts, evidence.evidenceId));
  return { status: "aggregated", aggregates: aggregates.sort((left, right) => left.apiNumber.localeCompare(right.apiNumber) || left.period.year - right.period.year || (left.period.month ?? 0) - (right.period.month ?? 0)), evidenceIds };
}

function validateEvidence(records: readonly WvProductionEvidence[]): void {
  const seen = new Set<string>();
  for (const evidence of records) {
    if (typeof evidence.evidenceId !== "string" || evidence.evidenceId.trim() === "") throw new Error("Production evidence ID must be a non-empty string");
    if (seen.has(evidence.evidenceId)) throw new Error("Duplicate production evidence ID");
    seen.add(evidence.evidenceId);
    const facts = evidence.normalizedFacts;
    if (typeof facts.apiNumber !== "string" || !/^\d{10}$/.test(facts.apiNumber)) throw new Error("Production API must be a canonical ten-digit string");
    if (!Number.isInteger(facts.period.year) || facts.period.year < 1 || facts.period.year > 9999) throw new Error("Production period year must be an integer from 1 to 9999");
    if (facts.period.month !== undefined && (!Number.isInteger(facts.period.month) || facts.period.month < 1 || facts.period.month > 12)) throw new Error("Production period month must be an integer from 1 to 12");
    for (const key of ["gasMcf", "oilBarrels", "condensateBarrels", "waterBarrels"] as const) {
      const value = facts[key];
      if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) throw new Error(`${key} must be finite when present`);
    }
  }
}

function sourceIdentityKey(evidence: WvProductionEvidence): string { const source = evidence.source; return JSON.stringify([source.id, source.publisher, source.dataset, source.mechanism, source.datasetVersion, source.authorityScope]); }
function periodsOverlap(left: ProductionRecord["period"], right: ProductionRecord["period"]): boolean { return left.year === right.year && (left.month === undefined || right.month === undefined || left.month === right.month); }
function toAggregate(record: ProductionRecord, evidenceId: string): AggregatedProduction { return { apiNumber: record.apiNumber, period: record.period, ...(record.gasMcf === undefined ? {} : { gasMcf: record.gasMcf }), ...(record.oilBarrels === undefined ? {} : { oilBarrels: record.oilBarrels }), ...(record.condensateBarrels === undefined ? {} : { condensateBarrels: record.condensateBarrels }), ...(record.waterBarrels === undefined ? {} : { waterBarrels: record.waterBarrels }), evidenceIds: [evidenceId], recordCount: 1 }; }
function incompatible(evidenceIds: readonly string[], reason: string): ProductionAggregationResult { return { status: "incompatible", aggregates: [], evidenceIds, reason }; }
