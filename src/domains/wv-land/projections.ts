import { noProductionMatch, reportedProduction, type LandProductionLookup, type LandProductionRecord, type LandWell } from "../land-administration/contracts";
import type { ProductionAggregationResult } from "./tools/production";
import type { ProductionRecord, WvProductionEvidence, WvWellEvidence } from "./contracts";

/** Maps WV facts into the deliberately smaller shared workflow projections. */
export function toLandWell(value: WvWellEvidence): LandWell {
  const well = value.normalizedFacts;
  return {
    wellId: well.apiNumber,
    identifiers: [
      { kind: "api", value: well.apiNumber, jurisdiction: "wv", publisher: value.source.publisher, sourceRecordId: value.sourceRecordId },
      ...(well.permitId === undefined ? [] : [{ kind: "permit", value: well.permitId, jurisdiction: "wv", publisher: value.source.publisher, sourceRecordId: value.sourceRecordId }]),
    ],
    ...(well.county === undefined ? {} : { county: well.county }),
    ...(well.surfaceLocation === undefined ? {} : { surfaceLocation: { role: "surface" as const, ...well.surfaceLocation } }),
    ...(well.wellNumber === undefined ? {} : { nameOrNumber: well.wellNumber }),
    ...(well.operator === undefined ? {} : { operator: well.operator }),
    ...(well.status === undefined ? {} : { status: well.status }),
    ...(well.wellType === undefined ? {} : { wellType: well.wellType }),
    ...(well.issuedDate === undefined ? {} : { issuedDate: well.issuedDate }),
    ...(well.completedDate === undefined ? {} : { completedDate: well.completedDate }),
    evidenceIds: [value.evidenceId, ...well.evidenceIds.filter((id) => id !== value.evidenceId)],
    extensions: definedExtensions({ sourceRecordType: well.sourceRecordType, farmOrLeaseName: well.farmOrLeaseName, leaseNumber: well.leaseNumber, operatorAtCompletion: well.operatorAtCompletion, formation: well.formation, measuredDepth: well.measuredDepth, trueVerticalDepth: well.trueVerticalDepth, productionEvidenceIds: [...well.productionEvidenceIds] }),
  };
}

/** A WV record is a reported observation for each populated commodity value. */
export function toLandProductionRecords(value: ProductionRecord): readonly LandProductionRecord[] {
  const values: Array<{ readonly value: number; readonly unit: string }> = [];
  if (value.gasMcf !== undefined) values.push({ value: value.gasMcf, unit: "MCF" });
  if (value.oilBarrels !== undefined) values.push({ value: value.oilBarrels, unit: "barrels" });
  if (value.condensateBarrels !== undefined) values.push({ value: value.condensateBarrels, unit: "barrels" });
  if (value.waterBarrels !== undefined) values.push({ value: value.waterBarrels, unit: "barrels" });
  return values.map((item, index) => ({ productionRecordId: values.length === 1 ? value.productionRecordId : `${value.productionRecordId}:${index + 1}`, wellId: value.apiNumber, period: value.period, value: item.value, unit: item.unit, matchStatus: "reported", evidenceId: value.evidenceId, ...(value.operator === undefined ? {} : { extensions: { operator: value.operator } }) }));
}

export function toLandProductionLookup(result: ProductionAggregationResult, records: readonly WvProductionEvidence[] = []): LandProductionLookup {
  if (result.status === "no-evidence") return noProductionMatch(result.reason, result.evidenceIds);
  if (result.status !== "aggregated") throw new Error(`Cannot project production result ${result.status}`);
  const projected = result.aggregates.flatMap((aggregate) => records.flatMap((evidence) => evidence.normalizedFacts.apiNumber === aggregate.apiNumber && JSON.stringify(evidence.normalizedFacts.period) === JSON.stringify(aggregate.period) ? toLandProductionRecords(evidence.normalizedFacts) : []));
  return reportedProduction(projected, result.evidenceIds);
}

function definedExtensions(values: Readonly<Record<string, unknown>>): Readonly<Record<string, import("../../evidence/contracts").JsonValue>> {
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, import("../../evidence/contracts").JsonValue] => entry[1] !== undefined));
}
