import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { join } from "node:path";
import type { Conflict, Finding, ProductionRecord, SourceIdentity, SourceSnapshot, Unknown, Well, WvProductionEvidence, WvWellEvidence } from "../src/domains/wv-land";
import { WvLandJsonCodec } from "../src/domains/wv-land";

const source = {
  id: "wvdep-oog-rbdms-wells",
  publisher: "WVDEP",
  dataset: "Enterprise oil and gas wells",
  mechanism: "arcgis-rest",
  datasetVersion: "layer-7",
  authorityScope: "reported regulatory well information",
} satisfies SourceIdentity;

const snapshot = {
  snapshotId: "snapshot-2026-09-03-wvdep-001",
  source,
  requestUrl: "https://tagis.dep.wv.gov/arcgis/rest/services/WVDEP_enterprise/oil_gas/MapServer/7/query",
  retrievedAt: "2026-09-03T15:00:00.000Z",
  effectiveDate: "2026-08-31",
  publicationDate: "2026-09-01",
  contentType: "application/geo+json",
  contentHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  rawSnapshotRef: "fixtures/wv-land/case-001/raw/wvdep-well.json",
  byteLength: 2048,
  parserVersion: "wvdep-well-parser@1",
  immutable: true,
} satisfies SourceSnapshot;

const well = {
  apiNumber: "47061012340000",
  permitId: "P-1234",
  county: "Doddridge",
  surfaceLocation: { latitude: 39.25, longitude: -80.75, datum: "WGS84" },
  wellNumber: "1H",
  farmOrLeaseName: "Synthetic Farm",
  leaseNumber: "SYN-LEASE-001",
  operator: "Synthetic Operator",
  status: "Active",
  wellType: "Horizontal",
  formation: "Marcellus",
  measuredDepth: 12000,
  trueVerticalDepth: 6500,
  issuedDate: "2020-01-02",
  completedDate: "2020-06-03",
  productionEvidenceIds: ["evidence-production-001"],
  evidenceIds: ["evidence-well-001"],
} satisfies Well;

const productionRecord = {
  productionRecordId: "2025:47061012340000",
  apiNumber: well.apiNumber,
  period: { year: 2025, month: 7 },
  gasMcf: 1200,
  oilBarrels: 3,
  condensateBarrels: 1,
  waterBarrels: 45,
  operator: well.operator,
  evidenceId: "evidence-production-001",
} satisfies ProductionRecord;

const wellEvidence = {
  evidenceId: "evidence-well-001",
  snapshotId: snapshot.snapshotId,
  source,
  sourceRecordId: well.apiNumber,
  sourceUrl: snapshot.requestUrl,
  retrievedAt: snapshot.retrievedAt,
  effectiveDate: snapshot.effectiveDate,
  publicationDate: snapshot.publicationDate,
  contentHash: snapshot.contentHash,
  rawSnapshotRef: snapshot.rawSnapshotRef,
  normalizedFacts: well,
  warnings: ["reported operator value retained as supplied"],
} satisfies WvWellEvidence;

const productionEvidence = {
  ...wellEvidence,
  evidenceId: "evidence-production-001",
  sourceRecordId: productionRecord.productionRecordId,
  sourceUrl: "https://apps.dep.wv.gov/Documents/OOG/ProductionReports/2020-2029/2025Production.xlsx",
  normalizedFacts: productionRecord,
  warnings: [],
} satisfies WvProductionEvidence;

const provenance = {
  runId: "run-001",
  stepId: "reconcile",
  inputRecordIds: ["case-001"],
  sourceEvidenceIds: [wellEvidence.evidenceId, productionEvidence.evidenceId],
  producerVersion: "wv-reconciliation@1",
};

function findingFor(status: Finding["status"], references: Pick<Finding, "evidenceIds" | "conflictIds" | "unknownIds">): Finding {
  return {
    findingId: `finding-${status}`,
    caseId: "case-001",
    subject: "operator",
    assertion: "The operator assessment is evidence-bounded.",
    status,
    confidence: status === "unknown" ? "unknown" : "medium",
    ...references,
    provenance,
    producer: "reconciler",
    producedAt: "2026-09-03T15:01:00.000Z",
  };
}

describe("WV land contract serialization", () => {
  const serializer = new WvLandJsonCodec();

  it("round-trips source, evidence, domain, finding, conflict, and unknown records", () => {
    const finding = {
      findingId: "finding-001",
      caseId: "case-001",
      subject: "well identity",
      assertion: "The supplied API matches the WVDEP well record.",
      status: "supported",
      confidence: "high",
      evidenceIds: [wellEvidence.evidenceId],
      conflictIds: [],
      unknownIds: [],
      provenance,
      producer: "land-well-lease-reconciliation",
      producedAt: "2026-09-03T15:01:00.000Z",
    } satisfies Finding;
    const conflict = {
      conflictId: "conflict-001",
      subject: "operator",
      claims: [
        { value: "WVDEP operator", evidenceIds: [wellEvidence.evidenceId] },
        { value: "WVGES operator", evidenceIds: [productionEvidence.evidenceId] },
      ],
      reason: "Independent sources report different operator values.",
      status: "unresolved",
      createdAt: "2026-09-03T15:02:00.000Z",
    } satisfies Conflict;
    const unknown = {
      unknownId: "unknown-001",
      subject: "mineral title",
      question: "Who owns the minerals under the tract?",
      reason: "Public well and regulatory records do not establish title.",
      neededEvidence: ["county deed records", "title opinion"],
      createdAt: "2026-09-03T15:03:00.000Z",
    } satisfies Unknown;

    assert.deepEqual(serializer.decodeSourceIdentity(serializer.encodeSourceIdentity(source)), source);
    assert.deepEqual(serializer.decodeSourceSnapshot(serializer.encodeSourceSnapshot(snapshot)), snapshot);
    assert.deepEqual(serializer.decodeWellEvidence(serializer.encodeWellEvidence(wellEvidence)), wellEvidence);
    assert.deepEqual(serializer.decodeProductionEvidence(serializer.encodeProductionEvidence(productionEvidence)), productionEvidence);
    assert.deepEqual(serializer.decodeWell(serializer.encodeWell(well)), well);
    assert.deepEqual(serializer.decodeProductionRecord(serializer.encodeProductionRecord(productionRecord)), productionRecord);
    assert.deepEqual(serializer.decodeFinding(serializer.encodeFinding(finding)), finding);
    assert.deepEqual(serializer.decodeConflict(serializer.encodeConflict(conflict)), conflict);
    assert.deepEqual(serializer.decodeUnknown(serializer.encodeUnknown(unknown)), unknown);
  });

  it("freezes parsed snapshot metadata and preserves independent source identity", () => {
    const parsed = serializer.decodeSourceSnapshot(serializer.encodeSourceSnapshot(snapshot));
    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(Object.isFrozen(parsed.source), true);
    assert.notEqual(parsed.source, source);
    assert.throws(() => Object.defineProperty(parsed, "requestUrl", { value: "https://example.com/changed" }), TypeError);

    const evidence = serializer.decodeWellEvidence(serializer.encodeWellEvidence(wellEvidence));
    assert.ok(evidence.normalizedFacts.surfaceLocation);
    assert.equal(Object.isFrozen(evidence), true);
    assert.equal(Object.isFrozen(evidence.normalizedFacts), true);
    assert.equal(Object.isFrozen(evidence.normalizedFacts.surfaceLocation), true);
    assert.equal(Object.isFrozen(evidence.warnings), true);
    assert.throws(() => Object.defineProperty(evidence.normalizedFacts.surfaceLocation, "latitude", { value: 0 }), TypeError);
  });

  it("rejects malformed snapshots, evidence, facts, and periods", () => {
    assert.throws(() => serializer.decodeSourceSnapshot(JSON.stringify({ ...snapshot, immutable: false })), /immutable must be true/);
    assert.throws(() => serializer.decodeSourceSnapshot(JSON.stringify({ ...snapshot, contentHash: "not-a-hash" })), /SHA-256/);
    assert.throws(() => serializer.decodeWellEvidence(JSON.stringify({ ...wellEvidence, sourceUrl: "not a URL" })), /sourceUrl/);
    assert.throws(() => serializer.decodeWell(JSON.stringify({ ...well, surfaceLocation: { latitude: 91, longitude: 0 } })), /latitude/);
    assert.throws(() => serializer.decodeProductionRecord(JSON.stringify({ ...productionRecord, period: { year: 2025, month: 13 } })), /month/);
    assert.throws(() => serializer.decodeProductionRecord(JSON.stringify({ ...productionRecord, gasMcf: "1200" })), /gasMcf/);
    assert.throws(() => serializer.decodeSourceIdentity("{invalid"), /Invalid source identity JSON/);
  });

  it("requires evidence for material findings and permits an explicit unknown status", () => {
    const base = {
      findingId: "finding-001",
      caseId: "case-001",
      subject: "operator",
      assertion: "The operator is known.",
      confidence: "unknown",
      evidenceIds: [],
      conflictIds: [],
      unknownIds: [],
      provenance,
      producer: "reconciler",
      producedAt: "2026-09-03T15:01:00.000Z",
    } satisfies Omit<Finding, "status">;
    assert.throws(() => serializer.encodeFinding({ ...base, status: "supported" } satisfies Finding), /require direct evidenceIds/);
    assert.doesNotThrow(() => serializer.encodeFinding({ ...base, status: "unknown" } satisfies Finding));
    assert.doesNotThrow(() => serializer.encodeFinding({ ...base, status: "unknown", unknownIds: ["unknown-001"] } satisfies Finding));
  });

  it("supports every finding outcome without fabricating evidence", () => {
    const cases: Array<[Finding["status"], Pick<Finding, "evidenceIds" | "conflictIds" | "unknownIds">]> = [
      ["supported", { evidenceIds: ["e1"], conflictIds: [], unknownIds: [] }],
      ["contradicted", { evidenceIds: ["e1"], conflictIds: [], unknownIds: [] }],
      ["inconclusive", { evidenceIds: [], conflictIds: ["c1"], unknownIds: [] }],
      ["inconclusive", { evidenceIds: [], conflictIds: [], unknownIds: ["u1"] }],
      ["unknown", { evidenceIds: [], conflictIds: [], unknownIds: [] }],
    ];
    for (const [status, references] of cases) {
      assert.deepEqual(serializer.decodeFinding(serializer.encodeFinding(findingFor(status, references))), findingFor(status, references));
    }
    assert.throws(() => serializer.encodeFinding(findingFor("inconclusive", { evidenceIds: [], conflictIds: [], unknownIds: [] })), /direct evidenceIds, conflictIds, or unknownIds/);
  });

  it("requires explicit timezone timestamps while accepting UTC and numeric offsets", () => {
    const validOffset = JSON.stringify({ ...snapshot, retrievedAt: "2026-09-03T15:00:00-04:00" });
    assert.doesNotThrow(() => serializer.decodeSourceSnapshot(validOffset));
    assert.throws(() => serializer.decodeSourceSnapshot(JSON.stringify({ ...snapshot, retrievedAt: "2026-09-03" })), /RFC 3339/);
    assert.throws(() => serializer.decodeSourceSnapshot(JSON.stringify({ ...snapshot, retrievedAt: "2026-09-03T15:00:00" })), /RFC 3339/);
    assert.throws(() => serializer.decodeSourceSnapshot(JSON.stringify({ ...snapshot, retrievedAt: "2026-02-30T15:00:00Z" })), /RFC 3339/);
    assert.throws(() => serializer.decodeSourceSnapshot(JSON.stringify({ ...snapshot, retrievedAt: "2026-99-99T15:00:00Z" })), /RFC 3339/);
    assert.throws(() => serializer.decodeFinding(JSON.stringify({ ...findingFor("unknown", { evidenceIds: [], conflictIds: [], unknownIds: [] }), producedAt: "2026-09-03T15:01:00" })), /RFC 3339/);
  });

  it("preserves absent optional fields and distinguishes zero production from absent production", () => {
    const minimalWell: Well = { apiNumber: "47061000000000", productionEvidenceIds: [], evidenceIds: [] };
    const zeroProduction: ProductionRecord = { productionRecordId: "1:47061000000000", apiNumber: minimalWell.apiNumber, period: { year: 1 }, gasMcf: 0, oilBarrels: 0, evidenceId: "e-zero" };
    const decodedWell = serializer.decodeWell(serializer.encodeWell(minimalWell));
    const decodedProduction = serializer.decodeProductionRecord(serializer.encodeProductionRecord(zeroProduction));
    assert.deepEqual(decodedWell, minimalWell);
    assert.deepEqual(decodedProduction, zeroProduction);
    assert.equal(Object.hasOwn(decodedProduction, "condensateBarrels"), false);
    assert.equal(decodedProduction.gasMcf, 0);
  });

  it("validates coordinate boundaries, production periods, and encode-time runtime shapes", () => {
    for (const location of [{ latitude: -90, longitude: -180 }, { latitude: 90, longitude: 180 }]) {
      assert.doesNotThrow(() => serializer.decodeWell(JSON.stringify({ apiNumber: "47061000000000", surfaceLocation: location, productionEvidenceIds: [], evidenceIds: [] })));
    }
    for (const location of [{ latitude: -90.1, longitude: 0 }, { latitude: 90.1, longitude: 0 }, { latitude: 0, longitude: -180.1 }, { latitude: 0, longitude: 180.1 }]) {
      assert.throws(() => serializer.decodeWell(JSON.stringify({ apiNumber: "47061000000000", surfaceLocation: location, productionEvidenceIds: [], evidenceIds: [] })), /latitude|longitude/);
    }
    assert.throws(() => serializer.decodeProductionRecord(JSON.stringify({ ...productionRecord, period: { year: 0 } })), /year/);
    assert.throws(() => serializer.decodeProductionRecord(JSON.stringify({ ...productionRecord, period: { year: 10000 } })), /year/);
    assert.throws(() => serializer.encodeSourceSnapshot(JSON.parse(JSON.stringify({ ...snapshot, immutable: false }))), /immutable must be true/);
    assert.throws(() => serializer.encodeWellEvidence(JSON.parse(JSON.stringify({ ...wellEvidence, contentHash: "bad" }))), /SHA-256/);
  });

  it("preserves all competing claims and rejects incomplete conflicts or unknown reasons", () => {
    const conflict = { conflictId: "conflict-001", subject: "operator", claims: [{ value: "one", evidenceIds: ["e1"] }], reason: "disagreement", status: "unresolved", createdAt: "2026-09-03T15:02:00.000Z" } satisfies Conflict;
    assert.throws(() => serializer.encodeConflict(conflict), /at least two/);
    assert.throws(() => serializer.encodeConflict({ ...conflict, claims: [{ value: "one", evidenceIds: [] }, { value: "two", evidenceIds: ["e2"] }] } satisfies Conflict), /claims\[0\].evidenceIds/);
    assert.throws(() => serializer.encodeUnknown({ unknownId: "u1", subject: "title", question: "Who owns it?", reason: "", createdAt: "2026-09-03T15:03:00.000Z" } satisfies Unknown), /reason/);
    const twoClaimConflict = { ...conflict, claims: [{ value: null, evidenceIds: ["e1"] }, { value: { source: "other" }, evidenceIds: ["e2"] }] } satisfies Conflict;
    assert.deepEqual(serializer.decodeConflict(serializer.encodeConflict(twoClaimConflict)), twoClaimConflict);
  });

  it("rejects values that JSON would silently drop", () => {
    const invalid = { conflictId: "conflict-001", subject: "operator", claims: [{ value: undefined, evidenceIds: ["e1"] }, { value: "two", evidenceIds: ["e2"] }], reason: "disagreement", status: "unresolved", createdAt: "2026-09-03T15:02:00.000Z" } satisfies Conflict;
    assert.throws(() => serializer.encodeConflict(invalid), /non-JSON value/);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const circularConflict = { conflictId: "conflict-002", subject: "operator", claims: [{ value: circular, evidenceIds: ["e1"] }, { value: "two", evidenceIds: ["e2"] }], reason: "disagreement", status: "unresolved", createdAt: "2026-09-03T15:02:00.000Z" } satisfies Conflict;
    assert.throws(() => serializer.encodeConflict(circularConflict), /circular reference/);
  });

  it("keeps West Virginia source vocabulary out of the jurisdiction-neutral core", async () => {
    const coreFiles = await readdir(join(process.cwd(), "src/core"), { recursive: true });
    const sourceText = await Promise.all(coreFiles.filter((file) => file.endsWith(".ts")).map((file) => readFile(join(process.cwd(), "src/core", file), "utf8")));
    assert.equal(sourceText.some((text) => /wvdep|wvges|west virginia/i.test(text)), false);
  });
});
