import type { SourceSnapshot, Well, WvWellEvidence } from "../../../../wv-land/contracts";
import type { RetrievalSnapshot, SourceRetrievalProvider } from "../../../../../retrieval/source";
import { SourceAdapterError, type SourceAdapter, type SourceAdapterQuery } from "./source-adapter";

type Feature = { readonly id?: unknown; readonly properties?: unknown; readonly geometry?: unknown };
type FeatureCollection = { readonly features?: unknown; readonly exceededTransferLimit?: unknown };
type FieldMap = {
  readonly sourceRecordId: (feature: Feature, properties: Record<string, unknown>) => string;
  readonly apiNumber: string;
  readonly permitId: (properties: Record<string, unknown>) => string | undefined;
  readonly county: string;
  readonly wellNumber: string | ((properties: Record<string, unknown>) => string | undefined);
  readonly sourceRecordType?: string;
  readonly farmOrLeaseName: string;
  readonly leaseNumber?: string;
  readonly operator: string;
  readonly operatorAtCompletion?: string;
  readonly status: string;
  readonly wellType: string;
  readonly formation: string;
  readonly measuredDepth?: string;
  readonly trueVerticalDepth?: string;
  readonly issuedDate?: string;
  readonly completedDate?: string;
  readonly geometry: "feature" | "properties";
};

const DATE_FIELDS = ["issuedDate", "completedDate"] as const;

export class ArcGisWellSourceAdapter implements SourceAdapter<Well> {
  constructor(
    private readonly source: WellSourceDefinition,
    private readonly retrieval: SourceRetrievalProvider,
  ) {}

  async query(query: SourceAdapterQuery): Promise<readonly WvWellEvidence[]> {
    const pages: WvWellEvidence[] = [];
    const pageSize = query.resultRecordCount ?? 1000;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > this.source.maxPageSize) throw new SourceAdapterError("request", `resultRecordCount must be an integer from 1 to ${this.source.maxPageSize}`, this.source.identity.id);
    if (query.resultOffset !== undefined && (!Number.isInteger(query.resultOffset) || query.resultOffset < 0)) throw new SourceAdapterError("request", "resultOffset must be a non-negative integer", this.source.identity.id);
    const seenPages = new Set<string>();
    let offset = query.resultOffset ?? 0;
    for (;;) {
      const requestUrl = this.buildUrl(query, offset, pageSize);
      const retrieved = await this.retrieval.retrieve(requestUrl, this.source.identity, { parserVersion: this.source.parserVersion });
      const collection = this.parseCollection(retrieved.bytes, requestUrl);
      const features = collection.features as Feature[];
      if (collection.exceededTransferLimit !== undefined && typeof collection.exceededTransferLimit !== "boolean") throw new SourceAdapterError("pagination", "exceededTransferLimit must be boolean when present", this.source.identity.id);
      if (features.length > pageSize) throw new SourceAdapterError("pagination", "ArcGIS returned more records than requested", this.source.identity.id);
      const pageKey = features.map((feature) => this.source.fields.sourceRecordId(feature, this.object(feature.properties, "feature.properties"))).join("|");
      if (features.length > 0 && seenPages.has(pageKey)) throw new SourceAdapterError("pagination", "ArcGIS returned a repeated page", this.source.identity.id);
      seenPages.add(pageKey);
      const snapshot = this.toSnapshot(retrieved.snapshot);
      pages.push(...features.map((feature, index) => this.normalize(feature, snapshot, requestUrl, index)));
      if (features.length < pageSize && collection.exceededTransferLimit !== true) break;
      if (features.length === 0) break;
      offset += features.length;
    }
    return pages;
  }

  private buildUrl(query: SourceAdapterQuery, offset: number, pageSize: number): string {
    if (query.apiNumber === undefined && query.permitId === undefined) throw new SourceAdapterError("request", "An API number or permit ID is required", this.source.identity.id);
    if (query.apiNumber !== undefined && !/^\d{10}$/.test(query.apiNumber)) throw new SourceAdapterError("request", "API number must contain exactly 10 digits", this.source.identity.id);
    if (query.permitId !== undefined && !this.validPermit(query.permitId)) throw new SourceAdapterError("request", "Permit ID has an unsupported format", this.source.identity.id);
    const clauses: string[] = [];
    if (query.apiNumber !== undefined) clauses.push(this.where(this.source.apiField, query.apiNumber));
    if (query.permitId !== undefined) clauses.push(this.where(this.source.permitField, query.permitId));
    const url = new URL(this.source.queryUrl);
    const parameters: Record<string, string> = { where: clauses.join(" AND "), outFields: "*", returnGeometry: "true", f: "geojson" };
    if (query.resultOffset !== undefined || query.resultRecordCount !== undefined) { parameters.resultOffset = String(offset); parameters.resultRecordCount = String(pageSize); }
    url.search = new URLSearchParams(parameters).toString();
    return url.toString();
  }

  private parseCollection(bytes: Uint8Array, requestUrl: string): FeatureCollection & { features: Feature[] } {
    let value: unknown;
    try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch (error) { throw new SourceAdapterError("parse", `Invalid ArcGIS JSON: ${error instanceof Error ? error.message : String(error)}`, this.source.identity.id); }
    if (typeof value !== "object" || value === null || !Array.isArray((value as FeatureCollection).features)) throw new SourceAdapterError("schema", `ArcGIS response has no features array (${requestUrl})`, this.source.identity.id);
    return value as FeatureCollection & { features: Feature[] };
  }

  private where(field: string, value: string): string { return this.source.identity.id === "wvdep-oog-rbdms-wells" ? `${field}='${value}'` : `${field} = ${value}`; }

  private validPermit(value: string): boolean { return this.source.identity.id === "wvdep-oog-rbdms-wells" ? /^\d{3}-\d{5}$/.test(value) : /^\d{1,5}$/.test(value); }

  private normalize(feature: Feature, snapshot: SourceSnapshot, requestUrl: string, index: number): WvWellEvidence {
    const properties = this.object(feature.properties, "feature.properties");
    const apiNumber = this.requiredString(properties, this.source.fields.apiNumber);
    const sourceRecordId = this.source.fields.sourceRecordId(feature, properties);
    if (sourceRecordId.endsWith(":undefined") || sourceRecordId.endsWith(":null")) throw new SourceAdapterError("schema", "Feature has no stable publisher record ID", this.source.identity.id);
    const facts: Well = {
      apiNumber,
      ...this.optionalFact("permitId", this.source.fields.permitId(properties)),
      ...this.optionalFact("county", this.optionalString(properties, this.source.fields.county)),
      ...this.location(feature, properties),
      ...this.optionalFact("wellNumber", typeof this.source.fields.wellNumber === "function" ? this.source.fields.wellNumber(properties) : this.optionalString(properties, this.source.fields.wellNumber)),
      ...this.optionalFact("sourceRecordType", this.source.fields.sourceRecordType === undefined ? undefined : this.optionalString(properties, this.source.fields.sourceRecordType)),
      ...this.optionalFact("farmOrLeaseName", this.optionalString(properties, this.source.fields.farmOrLeaseName)),
      ...this.optionalFact("leaseNumber", this.source.fields.leaseNumber === undefined ? undefined : this.optionalString(properties, this.source.fields.leaseNumber)),
      ...this.optionalFact("operator", this.optionalString(properties, this.source.fields.operator)),
      ...this.optionalFact("operatorAtCompletion", this.source.fields.operatorAtCompletion === undefined ? undefined : this.optionalString(properties, this.source.fields.operatorAtCompletion)),
      ...this.optionalFact("status", this.optionalString(properties, this.source.fields.status)),
      ...this.optionalFact("wellType", this.optionalString(properties, this.source.fields.wellType)),
      ...this.optionalFact("formation", this.source.fields.formation === undefined ? undefined : this.optionalString(properties, this.source.fields.formation)),
      ...this.optionalFact("measuredDepth", this.optionalNumber(properties, this.source.fields.measuredDepth)),
      ...this.optionalFact("trueVerticalDepth", this.optionalNumber(properties, this.source.fields.trueVerticalDepth)),
      ...this.optionalFact("issuedDate", this.date(properties, this.source.fields.issuedDate)),
      ...this.optionalFact("completedDate", this.date(properties, this.source.fields.completedDate)),
      productionEvidenceIds: [], evidenceIds: [`${this.source.identity.id}:${sourceRecordId}`],
    };
    const warnings = this.warnings(properties, facts, index);
    return { evidenceId: `evidence-${this.source.identity.id}-${sourceRecordId.replaceAll(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`, snapshotId: snapshot.snapshotId, source: snapshot.source, sourceRecordId, sourceUrl: requestUrl, retrievedAt: snapshot.retrievedAt, ...(snapshot.effectiveDate === undefined ? {} : { effectiveDate: snapshot.effectiveDate }), ...(snapshot.publicationDate === undefined ? {} : { publicationDate: snapshot.publicationDate }), contentHash: snapshot.contentHash, rawSnapshotRef: snapshot.rawSnapshotRef, normalizedFacts: facts, warnings };
  }

  private toSnapshot(snapshot: RetrievalSnapshot): SourceSnapshot { return { ...snapshot, source: this.source.identity }; }

  private location(feature: Feature, properties: Record<string, unknown>): Pick<Well, "surfaceLocation"> {
    const geometry = feature.geometry;
    if (this.source.fields.geometry === "feature" && typeof geometry === "object" && geometry !== null && Array.isArray((geometry as { coordinates?: unknown }).coordinates)) {
      const coordinates = (geometry as { coordinates: unknown[] }).coordinates;
      if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") return { surfaceLocation: { longitude: coordinates[0], latitude: coordinates[1], datum: "WGS84" } };
    }
    return {};
  }

  private warnings(properties: Record<string, unknown>, facts: Well, index: number): string[] {
    const warnings: string[] = [];
    for (const field of DATE_FIELDS) {
      const sourceField = this.source.fields[field];
      if (sourceField !== undefined && facts[field] === undefined && properties[sourceField] != null) warnings.push(`${field} was present but could not be normalized as YYYY-MM-DD.`);
    }
    for (const [fact, sourceField] of [["measuredDepth", this.source.fields.measuredDepth], ["trueVerticalDepth", this.source.fields.trueVerticalDepth]] as const) {
      if (sourceField !== undefined && properties[sourceField] != null && facts[fact] === undefined) warnings.push(`${fact} was present but was not a finite number; no value was fabricated.`);
    }
    if (facts.operator === undefined) warnings.push("Source operator field is empty; no operator fact was fabricated.");
    if (index > 0) warnings.push("Source returned multiple historical rows for one query; this record remains independent.");
    if (this.source.identity.id === "wvges-oilgas-wells") warnings.push("WVGES lease, mineral, and surface-owner fields remain publisher evidence; they are not title conclusions.");
    return warnings;
  }

  private date(properties: Record<string, unknown>, key: string | undefined): string | undefined {
    const value = this.optionalString(properties, key);
    if (value === undefined) return undefined;
    const match = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(value.trim());
    if (match === null) return undefined;
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  private optionalNumber(properties: Record<string, unknown>, key: string | undefined): number | undefined { const value = key === undefined ? undefined : properties[key]; if (value === null || value === undefined || value === "") return undefined; const number = typeof value === "number" ? value : Number(value); return Number.isFinite(number) ? number : undefined; }
  private optionalString(properties: Record<string, unknown>, key: string | undefined): string | undefined { const value = key === undefined ? undefined : properties[key]; return value === null || value === undefined || value === "" ? undefined : String(value).trim() || undefined; }
  private requiredString(properties: Record<string, unknown>, key: string): string { const value = this.optionalString(properties, key); if (value === undefined) throw new SourceAdapterError("schema", `Required source field ${key} is empty`, this.source.identity.id); return value; }
  private object(value: unknown, label: string): Record<string, unknown> { if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SourceAdapterError("schema", `${label} must be an object`, this.source.identity.id); return value as Record<string, unknown>; }
  private optionalFact<K extends keyof Well>(key: K, value: Well[K] | undefined): Partial<Pick<Well, K>> { return value === undefined ? {} : { [key]: value } as Pick<Well, K>; }
}

interface WellSourceDefinition {
  readonly identity: WvWellEvidence["source"];
  readonly queryUrl: string;
  readonly apiField: string;
  readonly permitField: string;
  readonly parserVersion: string;
  readonly maxPageSize: number;
  readonly fields: FieldMap;
}

export const WVDEP_WELL_SOURCE = { identity: { id: "wvdep-oog-rbdms-wells", publisher: "WVDEP", dataset: "Enterprise oil and gas wells", mechanism: "arcgis-rest", datasetVersion: "MapServer layer 7", authorityScope: "reported regulatory well information" }, queryUrl: "https://tagis.dep.wv.gov/arcgis/rest/services/WVDEP_enterprise/oil_gas/MapServer/7/query", apiField: "api", permitField: "permitid", parserVersion: "wvdep-well-v1", maxPageSize: 3000, fields: { sourceRecordId: (_feature, properties) => `objectid:${String(properties.objectid)}`, apiNumber: "api", permitId: (properties) => stringOrUndefined(properties.permitid), county: "county", wellNumber: "wellnumber", farmOrLeaseName: "farmname", operator: "respparty", status: "wellstatus", wellType: "welltype", formation: "formation", issuedDate: "issuedate", completedDate: "compdate", geometry: "feature" } } satisfies WellSourceDefinition;
export const WVGES_WELL_SOURCE = { identity: { id: "wvges-oilgas-wells", publisher: "WVGES", dataset: "OilGas_WVOG all individual oil and gas wells", mechanism: "arcgis-rest", datasetVersion: "MapServer layer 4", authorityScope: "geological and historical well information" }, queryUrl: "https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer/4/query", apiField: "api", permitField: "permit", parserVersion: "wvges-well-v1", maxPageSize: 2000, fields: { sourceRecordId: (_feature, properties) => `OBJECTID:${String(properties.OBJECTID)}`, apiNumber: "api", permitId: (properties) => stringOrUndefined(properties.permit), county: "countyname", wellNumber: (properties) => stringOrUndefined(properties.well_num) ?? stringOrUndefined(properties.co_num), sourceRecordType: "suffixtr", farmOrLeaseName: "lease", leaseNumber: "leasenum", operator: "opernm", status: "statustr", wellType: "welltypetr", formation: "dfmnm", measuredDepth: "td", issuedDate: undefined, completedDate: undefined, geometry: "feature" } } satisfies WellSourceDefinition;

function stringOrUndefined(value: unknown): string | undefined { return value === null || value === undefined || value === "" ? undefined : String(value); }

export class WvdepWellSourceAdapter extends ArcGisWellSourceAdapter { constructor(retrieval: SourceRetrievalProvider) { super(WVDEP_WELL_SOURCE, retrieval); } }
export class WvgesWellSourceAdapter extends ArcGisWellSourceAdapter { constructor(retrieval: SourceRetrievalProvider) { super(WVGES_WELL_SOURCE, retrieval); } }
