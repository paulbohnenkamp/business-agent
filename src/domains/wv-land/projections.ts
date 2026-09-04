import type { LandProductionRecord, LandWell } from "../land-administration/contracts";
import type { ProductionRecord, Well } from "./contracts";

/** Maps WV facts into the deliberately smaller shared workflow projections. */
export function toLandWell(value: Well): LandWell {
  return {
    wellId: value.apiNumber,
    identifiers: { apiNumber: value.apiNumber, ...(value.permitId === undefined ? {} : { permitId: value.permitId }) },
    ...(value.county === undefined ? {} : { county: value.county }),
    ...(value.surfaceLocation === undefined ? {} : { surfaceLocation: value.surfaceLocation }),
    ...(value.wellNumber === undefined ? {} : { nameOrNumber: value.wellNumber }),
    ...(value.operator === undefined ? {} : { operator: value.operator }),
    ...(value.status === undefined ? {} : { status: value.status }),
    ...(value.wellType === undefined ? {} : { wellType: value.wellType }),
    ...(value.issuedDate === undefined ? {} : { issuedDate: value.issuedDate }),
    ...(value.completedDate === undefined ? {} : { completedDate: value.completedDate }),
    evidenceIds: [...value.evidenceIds],
    extensions: { sourceRecordType: value.sourceRecordType, farmOrLeaseName: value.farmOrLeaseName, leaseNumber: value.leaseNumber, operatorAtCompletion: value.operatorAtCompletion, formation: value.formation, measuredDepth: value.measuredDepth, trueVerticalDepth: value.trueVerticalDepth, productionEvidenceIds: [...value.productionEvidenceIds] },
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
