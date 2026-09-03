import type { ProductionRecord, Well } from "./contracts";
import { JsonBoundary } from "./json-boundary";

/** Validates normalized WV well and production facts without source transport concerns. */
export class WvFactCodec {
  constructor(private readonly json: JsonBoundary) {}

  encodeWell(value: Well): string { return this.json.encode(value, "well", (input) => this.readWell(input)); }
  decodeWell(serialized: string): Well { return this.json.deepFreeze(this.json.decode(serialized, "well", (input) => this.readWell(input))); }
  encodeProductionRecord(value: ProductionRecord): string { return this.json.encode(value, "production record", (input) => this.readProductionRecord(input)); }
  decodeProductionRecord(serialized: string): ProductionRecord { return this.json.deepFreeze(this.json.decode(serialized, "production record", (input) => this.readProductionRecord(input))); }

  readWell(value: unknown): Well {
    const object = this.json.object(value);
    const surfaceLocation = object.surfaceLocation === undefined ? undefined : this.readLocation(object.surfaceLocation);
    return { apiNumber: this.json.string(object, "apiNumber"), permitId: this.json.optionalString(object, "permitId"), county: this.json.optionalString(object, "county"), ...(surfaceLocation === undefined ? {} : { surfaceLocation }), wellNumber: this.json.optionalString(object, "wellNumber"), farmOrLeaseName: this.json.optionalString(object, "farmOrLeaseName"), leaseNumber: this.json.optionalString(object, "leaseNumber"), operator: this.json.optionalString(object, "operator"), operatorAtCompletion: this.json.optionalString(object, "operatorAtCompletion"), status: this.json.optionalString(object, "status"), wellType: this.json.optionalString(object, "wellType"), formation: this.json.optionalString(object, "formation"), measuredDepth: this.json.optionalNumber(object, "measuredDepth"), trueVerticalDepth: this.json.optionalNumber(object, "trueVerticalDepth"), issuedDate: this.json.optionalDate(object, "issuedDate"), completedDate: this.json.optionalDate(object, "completedDate"), productionEvidenceIds: this.json.stringArray(object, "productionEvidenceIds"), evidenceIds: this.json.stringArray(object, "evidenceIds") };
  }

  readProductionRecord(value: unknown): ProductionRecord {
    const object = this.json.object(value);
    const period = this.json.object(object.period);
    const month = period.month === undefined ? undefined : this.integerInRange(period, "month", 1, 12);
    return { productionRecordId: this.json.string(object, "productionRecordId"), apiNumber: this.json.string(object, "apiNumber"), period: { year: this.integerInRange(period, "year", 1, 9999), ...(month === undefined ? {} : { month }) }, gasMcf: this.json.optionalNumber(object, "gasMcf"), oilBarrels: this.json.optionalNumber(object, "oilBarrels"), condensateBarrels: this.json.optionalNumber(object, "condensateBarrels"), waterBarrels: this.json.optionalNumber(object, "waterBarrels"), operator: this.json.optionalString(object, "operator"), evidenceId: this.json.string(object, "evidenceId") };
  }

  private readLocation(value: unknown): NonNullable<Well["surfaceLocation"]> {
    const object = this.json.object(value);
    const latitude = this.json.number(object, "latitude");
    const longitude = this.json.number(object, "longitude");
    if (latitude < -90 || latitude > 90) throw new Error("latitude must be between -90 and 90");
    if (longitude < -180 || longitude > 180) throw new Error("longitude must be between -180 and 180");
    const datum = this.json.optionalString(object, "datum");
    return { latitude, longitude, ...(datum === undefined ? {} : { datum }) };
  }

  private integerInRange(object: Record<string, unknown>, key: string, minimum: number, maximum: number): number {
    const value = this.json.number(object, key);
    if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${key} must be an integer from ${minimum} to ${maximum}`);
    return value;
  }
}
