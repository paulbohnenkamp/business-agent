import type { ProductionRecord, SourceEvidence, SourceIdentity, SourceSnapshot, Well } from "./contracts";
import { WvFactCodec } from "./fact-codec";
import { JsonBoundary } from "./json-boundary";

/** Validates source identity, immutable snapshot metadata, and source evidence. */
export class WvSourceCodec {
  constructor(private readonly json: JsonBoundary, private readonly facts: WvFactCodec) {}

  encodeIdentity(value: SourceIdentity): string { return this.json.encode(value, "source identity", (input) => this.readIdentity(input)); }
  decodeIdentity(serialized: string): SourceIdentity { return this.json.deepFreeze(this.json.decode(serialized, "source identity", (input) => this.readIdentity(input))); }
  encodeSnapshot(value: SourceSnapshot): string { return this.json.encode(value, "source snapshot", (input) => this.readSnapshot(input)); }
  decodeSnapshot(serialized: string): SourceSnapshot { return this.json.deepFreeze(this.json.decode(serialized, "source snapshot", (input) => this.readSnapshot(input))); }
  encodeWellEvidence(value: SourceEvidence<Well>): string { return this.json.encode(value, "well evidence", (input) => this.readEvidence(input, (facts) => this.facts.readWell(facts))); }
  decodeWellEvidence(serialized: string): SourceEvidence<Well> { return this.json.deepFreeze(this.json.decode(serialized, "well evidence", (input) => this.readEvidence(input, (facts) => this.facts.readWell(facts)))); }
  encodeProductionEvidence(value: SourceEvidence<ProductionRecord>): string { return this.json.encode(value, "production evidence", (input) => this.readEvidence(input, (facts) => this.facts.readProductionRecord(facts))); }
  decodeProductionEvidence(serialized: string): SourceEvidence<ProductionRecord> { return this.json.deepFreeze(this.json.decode(serialized, "production evidence", (input) => this.readEvidence(input, (facts) => this.facts.readProductionRecord(facts)))); }

  private readIdentity(value: unknown): SourceIdentity {
    const object = this.json.object(value);
    const datasetVersion = this.json.optionalString(object, "datasetVersion");
    return { id: this.json.string(object, "id"), publisher: this.json.string(object, "publisher"), dataset: this.json.string(object, "dataset"), mechanism: this.json.enumValue(object, "mechanism", ["arcgis-rest", "xlsx-download"]), ...(datasetVersion === undefined ? {} : { datasetVersion }), authorityScope: this.json.string(object, "authorityScope") };
  }

  private readSnapshot(value: unknown): SourceSnapshot {
    const object = this.json.object(value);
    if (object.immutable !== true) throw new Error("immutable must be true");
    const parserVersion = this.json.optionalString(object, "parserVersion");
    return { snapshotId: this.json.string(object, "snapshotId"), source: this.readIdentity(object.source), requestUrl: this.json.url(object, "requestUrl"), retrievedAt: this.json.timestamp(object, "retrievedAt"), effectiveDate: this.json.optionalDate(object, "effectiveDate"), publicationDate: this.json.optionalDate(object, "publicationDate"), contentType: this.json.string(object, "contentType"), contentHash: this.hash(object, "contentHash"), rawSnapshotRef: this.json.string(object, "rawSnapshotRef"), byteLength: this.nonNegativeInteger(object, "byteLength"), ...(parserVersion === undefined ? {} : { parserVersion }), immutable: true };
  }

  private readEvidence<T>(value: unknown, factsReader: (facts: unknown) => T): SourceEvidence<T> {
    const object = this.json.object(value);
    return { evidenceId: this.json.string(object, "evidenceId"), snapshotId: this.json.string(object, "snapshotId"), source: this.readIdentity(object.source), sourceRecordId: this.json.string(object, "sourceRecordId"), sourceUrl: this.json.url(object, "sourceUrl"), retrievedAt: this.json.timestamp(object, "retrievedAt"), effectiveDate: this.json.optionalDate(object, "effectiveDate"), publicationDate: this.json.optionalDate(object, "publicationDate"), contentHash: this.hash(object, "contentHash"), rawSnapshotRef: this.json.string(object, "rawSnapshotRef"), normalizedFacts: factsReader(object.normalizedFacts), warnings: this.json.stringArray(object, "warnings") };
  }

  private hash(object: Record<string, unknown>, key: string): string {
    const value = this.json.string(object, key);
    if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${key} must be a SHA-256 hex digest`);
    return value;
  }

  private nonNegativeInteger(object: Record<string, unknown>, key: string): number {
    const value = this.json.number(object, key);
    if (!Number.isInteger(value) || value < 0) throw new Error(`${key} must be a non-negative integer`);
    return value;
  }

}
