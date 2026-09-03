import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { join } from "node:path";
import { aggregateProduction, compareCoordinates, compareIdentifiers, compareNames, compareSourceDates, normalizeApiNumber, normalizeName, normalizePermitId, parseSourceDate, sha256 } from "../src/domains/wv-land";
import type { ProductionRecord, SourceIdentity, WvProductionEvidence, Well } from "../src/domains/wv-land";

const fixtureRoot = join(process.cwd(), "fixtures/wv-land/braxton-4700701733");
const source: SourceIdentity = { id: "test-production", publisher: "Test Publisher", dataset: "annual production", mechanism: "xlsx-download", authorityScope: "reported production" };
function evidence(id: string, facts: ProductionRecord, sourceOverride = source): WvProductionEvidence { return { evidenceId: id, snapshotId: `snapshot-${id}`, source: sourceOverride, sourceRecordId: facts.productionRecordId, sourceUrl: "https://fixture.test/production.xlsx", retrievedAt: "2026-09-03T00:00:00Z", contentHash: "a".repeat(64), rawSnapshotRef: `fixture:${id}`, normalizedFacts: facts, warnings: [] }; }
function facts(id: string, values: Partial<ProductionRecord> = {}): ProductionRecord { return { productionRecordId: id, apiNumber: "4700701733", period: { year: 2025 }, evidenceId: id, ...values }; }

describe("WV land deterministic tools", () => {
  it("normalizes separate API and permit identifiers without guessing", () => {
    assert.equal(normalizeApiNumber("47-007-01733"), "4700701733");
    assert.equal(normalizeApiNumber("39-001-00001"), "3900100001");
    assert.equal(normalizePermitId("007-00001"), "007-00001");
    assert.equal(normalizePermitId("00001"), "00001");
    assert.throws(() => normalizeApiNumber("47-007 01733"), /consistent/);
    assert.throws(() => normalizePermitId("12-345"), /ambiguous/);
    assert.equal(compareIdentifiers("api", "39-001-00001", "3900100001").result, "equal");
    assert.equal(compareIdentifiers("api", undefined, "4700701733").result, "unknown");
  });

  it("normalizes names without implying entity identity", () => {
    assert.deepEqual(normalizeName("Ross & Wharton Gas Co., Inc."), { original: "Ross & Wharton Gas Co., Inc.", normalized: "ROSS AND WHARTON GAS CO INC" });
    assert.equal(compareNames("Ross & Wharton", "ROSS AND WHARTON").result, "equal");
    assert.equal(compareNames("O'Brien-Gas", "O BRIEN GAS").result, "equal");
    assert.equal(compareNames("GAS COMPANY", "GAS CO").result, "different");
    assert.equal(compareNames(undefined, "operator").result, "unknown");
  });

  it("preserves date precision and validates Gregorian leap years structurally", () => {
    assert.deepEqual(parseSourceDate("2025"), { original: "2025", year: 2025, precision: "year" });
    assert.deepEqual(parseSourceDate("2025-03"), { original: "2025-03", year: 2025, month: 3, precision: "month" });
    assert.equal(compareSourceDates("2025-03", "2025-03-01").result, "overlapping");
    assert.equal(compareSourceDates("2025-03-01", "2025-03-01").result, "equal");
    assert.deepEqual(parseSourceDate("0000-02-29").precision, "day");
    assert.throws(() => parseSourceDate("0099-02-29"), /day is invalid/);
    assert.deepEqual(parseSourceDate("2000-02-29").day, 29);
    assert.throws(() => parseSourceDate("1900-02-29"), /day is invalid/);
  });

  it("fails closed for coordinates and documents approximate distance", () => {
    const same = compareCoordinates({ latitude: 39, longitude: -80, datum: "WGS84" }, { latitude: 39, longitude: -80, datum: "WGS84" }, { tolerance: 0, unit: "meters" });
    assert.equal(same.result, "within-tolerance"); assert.equal(same.distance, 0); assert.match(same.datumAssumption, /Spherical haversine approximation/);
    const mile = compareCoordinates({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }, { tolerance: 69, unit: "miles" });
    assert.equal(mile.result, "outside-tolerance"); assert.ok((mile.distance ?? 0) > 69 && (mile.distance ?? 0) < 70);
    assert.equal(compareCoordinates(undefined, { latitude: 39, longitude: -80 }, { tolerance: 10 }).result, "unknown");
    assert.equal(compareCoordinates({ latitude: 39, longitude: -80, datum: "NAD27" }, { latitude: 39, longitude: -80, datum: "NAD27" }, { tolerance: 10 }).result, "unknown");
    assert.throws(() => compareCoordinates({ latitude: 39, longitude: -80 }, { latitude: 39, longitude: -80 }, { tolerance: 1, unit: "yards" as never }), /unit/);
    assert.throws(() => compareCoordinates({ latitude: 91, longitude: 0 }, { latitude: 0, longitude: 0 }, { tolerance: 1 }), /Latitude/);
  });

  it("hashes exact bytes with a known vector", async () => {
    assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const bytes = new Uint8Array(await readFile(join(fixtureRoot, "raw/wvdep-well.json")));
    assert.equal(sha256(bytes), createHash("sha256").update(bytes).digest("hex"));
  });

  it("returns explicit no-evidence, invalid-input, incompatible, and aggregate results", () => {
    assert.deepEqual(aggregateProduction([]), { status: "no-evidence", aggregates: [], evidenceIds: [], reason: "No production evidence matched the query." });
    const good = aggregateProduction([evidence("e1", facts("a", { gasMcf: 0, oilBarrels: 2 }))]);
    assert.deepEqual(good, { status: "aggregated", aggregates: [{ apiNumber: "4700701733", period: { year: 2025 }, gasMcf: 0, oilBarrels: 2, evidenceIds: ["e1"], recordCount: 1 }], evidenceIds: ["e1"] });
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const result = aggregateProduction([evidence("bad", facts("bad", { gasMcf: value }))]);
      assert.equal(result.status, "invalid-input");
    }
    assert.equal(aggregateProduction([evidence("bad", facts("bad", { period: { year: 2025, month: 13 } }))]).status, "invalid-input");
    assert.equal(aggregateProduction([evidence("", facts("bad"))]).status, "invalid-input");
  });

  it("rejects duplicate, overlapping, and incompatible evidence without arithmetic", () => {
    assert.equal(aggregateProduction([evidence("e1", facts("a", { gasMcf: 2 })), evidence("e1", facts("a", { gasMcf: 2 }))]).status, "invalid-input");
    assert.equal(aggregateProduction([evidence("e1", facts("a", { gasMcf: 2 })), evidence("e2", facts("b", { gasMcf: 2 }))]).status, "incompatible");
    assert.equal(aggregateProduction([evidence("e1", facts("a", { gasMcf: 2 })), evidence("e2", facts("b", { period: { year: 2025, month: 1 }, gasMcf: 2 }))]).status, "incompatible");
    const other: SourceIdentity = { ...source, id: "other-source", publisher: "Other Publisher" };
    const result = aggregateProduction([evidence("e1", facts("a", { gasMcf: 2 })), evidence("e2", facts("b", { period: { year: 2026 }, gasMcf: 2 }), other)]);
    assert.equal(result.status, "incompatible"); assert.deepEqual(result.evidenceIds, ["e1", "e2"]);
  });

  it("keeps the five independent flagship well records independent", async () => {
    const dep = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvdep-well.json"), "utf8")) as Array<{ normalizedFacts: Well }>;
    const ges = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvges-well.json"), "utf8")) as Array<{ normalizedFacts: Well }>;
    assert.equal(new Set([...dep, ...ges].map(({ normalizedFacts }) => normalizedFacts.evidenceIds[0])).size, 5);
    assert.equal(compareNames(dep[1].normalizedFacts.operator, ges[1].normalizedFacts.operator).result, "different");
  });
});
