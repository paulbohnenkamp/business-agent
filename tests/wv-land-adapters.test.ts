import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { join } from "node:path";
import { WvdepAnnualWorkbookReader, WvdepProductionSourceAdapter, WvdepWellSourceAdapter, WvgesWellSourceAdapter, type WorkbookReader } from "../src/domains/wv-land";
import type { SourceSnapshot, Well } from "../src/domains/wv-land";
import { StaticSourceRetrievalProvider, type RetrievalSnapshot, type SourceRetrievalProvider } from "../src/retrieval/source";

const root = join(process.cwd(), "fixtures/wv-land/braxton-4700701733");

describe("WV source adapters", () => {
  it("maps all WVDEP historical rows and GeoJSON geometry without collapsing them", async () => {
    const [snapshot, bytes, expected] = await fixture("wvdep-well.json", "wvdep-well");
    const adapter = new WvdepWellSourceAdapter(new StaticSourceRetrievalProvider({ [snapshot.requestUrl]: { snapshot, bytes } }));
    const actual = await adapter.query({ apiNumber: "4700701733" });
    assert.equal(actual.length, 3);
    assert.deepEqual(actual.map((item) => item.sourceRecordId), ["objectid:99486", "objectid:100001", "objectid:104461"]);
    assert.deepEqual(actual.map((item) => item.normalizedFacts.issuedDate), expected.map((item) => item.normalizedFacts.issuedDate));
    assert.equal(actual[0]?.normalizedFacts.surfaceLocation?.datum, "WGS84");
    assert.equal(actual[0]?.normalizedFacts.surfaceLocation?.latitude, 38.648937656887654);
    assert.equal(actual[0]?.normalizedFacts.surfaceLocation?.longitude, -80.91509807502884);
    assert.ok(actual.every((item) => item.source.id === "wvdep-oog-rbdms-wells" && item.contentHash === snapshot.contentHash));
  });

  it("keeps WVGES identity, lease evidence mapping, and operator history independent", async () => {
    const [snapshot, bytes] = await fixture("wvges-well.geojson", "wvges-well");
    const adapter = new WvgesWellSourceAdapter(new StaticSourceRetrievalProvider({ [snapshot.requestUrl]: { snapshot, bytes } }));
    const actual = await adapter.query({ apiNumber: "4700701733" });
    assert.equal(actual.length, 2);
    assert.equal(actual[0]?.sourceRecordId, "OBJECTID:21403259");
    assert.equal(actual[1]?.normalizedFacts.farmOrLeaseName, "Lovey Duffield");
    assert.equal(actual[1]?.normalizedFacts.wellNumber, "3-S-245");
    assert.equal(actual[0]?.normalizedFacts.sourceRecordType, "Original Location");
    assert.equal(actual[1]?.normalizedFacts.sourceRecordType, "Plugging");
    assert.equal(actual[0]?.normalizedFacts.permitId, "1733");
    assert.equal(actual[0]?.normalizedFacts.operator, "Stonestreet Lands Co.");
    assert.equal(actual[1]?.normalizedFacts.operator, "Ross & Wharton Gas Co., Inc.");
    assert.match(actual[0]?.warnings.join(" ") ?? "", /not title conclusions/);
  });

  it("paginates ArcGIS responses using the provider and preserves page snapshots", async () => {
    const [snapshot, bytes] = await fixture("wvdep-well.json", "wvdep-well");
    const page = JSON.parse(new TextDecoder().decode(bytes)) as { features: unknown[] };
    const pages = [new Uint8Array(new TextEncoder().encode(JSON.stringify({ ...page, features: page.features.slice(0, 1) }))), new Uint8Array(new TextEncoder().encode(JSON.stringify({ ...page, features: page.features.slice(1, 2) })))];
    const seen: string[] = [];
    const provider: SourceRetrievalProvider = { async retrieve(url) { seen.push(url); const pageBytes = pages[seen.length - 1]; if (pageBytes === undefined) return { snapshot, bytes: new TextEncoder().encode('{"features":[]}') }; return { snapshot: { ...snapshot, snapshotId: `${snapshot.snapshotId}-${seen.length}` }, bytes: pageBytes }; } };
    const adapter = new WvdepWellSourceAdapter(provider);
    const actual = await adapter.query({ apiNumber: "4700701733", resultRecordCount: 1 });
    assert.equal(actual.length, 2);
    assert.equal(seen.length, 3);
    assert.match(seen[0] ?? "", /resultOffset=0/);
    assert.match(seen[1] ?? "", /resultOffset=1/);
    assert.notEqual(actual[0]?.snapshotId, actual[1]?.snapshotId);
  });

  it("returns no production evidence for a workbook no-match", async () => {
    const [snapshot, bytes] = await fixture("wvdep-production.xlsx", "wvdep-production");
    const adapter = new WvdepProductionSourceAdapter(new StaticSourceRetrievalProvider({ [snapshot.requestUrl]: { snapshot, bytes } }));
    assert.deepEqual(await adapter.query({ apiNumber: "4700701733" }), []);
  });

  it("retains reported zero and distinguishes it from missing values", async () => {
    const bytes = new Uint8Array([1]);
    const snapshot = makeSnapshot("https://fixture.test/annual.xlsx", "xlsx", bytes);
    const reader: WorkbookReader = { async read() { return [{ Year: 2025, API: "4700701733", Operator: "Example", Total_Gas: 0, Total_Oil: "", Total_Water: 2 }]; } };
    const adapter = new WvdepProductionSourceAdapter(new StaticSourceRetrievalProvider({ [snapshot.requestUrl]: { snapshot, bytes } }), reader, snapshot.requestUrl);
    const [actual] = await adapter.query({ apiNumber: "4700701733" });
    assert.equal(actual?.normalizedFacts.gasMcf, 0);
    assert.equal(actual?.normalizedFacts.oilBarrels, undefined);
    assert.equal(actual?.normalizedFacts.waterBarrels, 2);
  });

  it("reports malformed source schemas as typed adapter failures", async () => {
    const bytes = new TextEncoder().encode("{\"unexpected\":true}");
    const snapshot = makeSnapshot("https://tagis.dep.wv.gov/arcgis/rest/services/WVDEP_enterprise/oil_gas/MapServer/7/query?where=api%3D%274700701733%27&outFields=%2A&returnGeometry=true&f=geojson", "json", bytes, "wvdep-oog-rbdms-wells");
    const adapter = new WvdepWellSourceAdapter(new StaticSourceRetrievalProvider({ [snapshot.requestUrl]: { snapshot, bytes } }));
    await assert.rejects(adapter.query({ apiNumber: "4700701733" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError" && error.message.includes("features array"));
  });

  it("rejects malformed or injection-like identifiers before retrieval", async () => {
    let calls = 0;
    const provider: SourceRetrievalProvider = { async retrieve() { calls += 1; throw new Error("must not retrieve"); } };
    const adapter = new WvdepWellSourceAdapter(provider);
    await assert.rejects(adapter.query({ apiNumber: "4700701733' OR 1=1 --" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError");
    await assert.rejects(adapter.query({ apiNumber: "123" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError");
    await assert.rejects(adapter.query({ permitId: "007-01733' OR 1=1 --" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError");
    assert.equal(calls, 0);
  });

  it("preserves a non-Braxton WVGES permit component without inventing a county prefix", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", id: 9, geometry: { type: "Point", coordinates: [-81, 39] }, properties: { OBJECTID: 9, api: 5400100001, countyname: "Kanawha", permit: 42, suffixtr: "Original Location", well_num: null, co_num: "A-1", opernm: "Example Operator", statustr: "Completed" } }] }));
    const url = "https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer/4/query?where=api%20%3D%205400100001&outFields=%2A&returnGeometry=true&f=geojson";
    const snapshot = makeSnapshot(url, "json", bytes, "wvges-oilgas-wells");
    const [actual] = await new WvgesWellSourceAdapter(new StaticSourceRetrievalProvider({ [url]: { snapshot, bytes } })).query({ apiNumber: "5400100001" });
    assert.equal(actual?.normalizedFacts.permitId, "42");
    assert.equal(actual?.normalizedFacts.wellNumber, "A-1");
  });

  it("terminates repeated ArcGIS pages with a typed pagination error", async () => {
    const [snapshot, bytes] = await fixture("wvdep-well.json", "wvdep-well");
    const page = JSON.parse(new TextDecoder().decode(bytes)) as { features: unknown[] };
    const repeatedPage = new TextEncoder().encode(JSON.stringify({ ...page, features: page.features.slice(0, 1) }));
    const provider: SourceRetrievalProvider = { async retrieve() { return { snapshot, bytes: repeatedPage }; } };
    await assert.rejects(new WvdepWellSourceAdapter(provider).query({ apiNumber: "4700701733", resultRecordCount: 1 }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError" && error.message.includes("repeated page"));
  });

  it("rejects malformed individual features and pagination metadata", async () => {
    const url = "https://tagis.dep.wv.gov/arcgis/rest/services/WVDEP_enterprise/oil_gas/MapServer/7/query?where=api%3D%274700701733%27&outFields=%2A&returnGeometry=true&f=geojson";
    const malformed = new TextEncoder().encode(JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", properties: { api: "4700701733" } }] }));
    const snapshot = makeSnapshot(url, "json", malformed, "wvdep-oog-rbdms-wells");
    const provider: SourceRetrievalProvider = { async retrieve() { return { snapshot, bytes: malformed }; } };
    await assert.rejects(new WvdepWellSourceAdapter(provider).query({ apiNumber: "4700701733" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError" && error.message.includes("stable publisher record ID"));

    const invalidMetadata = new TextEncoder().encode(JSON.stringify({ type: "FeatureCollection", exceededTransferLimit: "yes", features: [] }));
    const invalidSnapshot = makeSnapshot(url, "json", invalidMetadata, "wvdep-oog-rbdms-wells");
    await assert.rejects(new WvdepWellSourceAdapter({ async retrieve() { return { snapshot: invalidSnapshot, bytes: invalidMetadata }; } }).query({ apiNumber: "4700701733" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError" && error.message.includes("exceededTransferLimit"));
  });

  it("turns malformed or incomplete annual XLSX input into a typed parse failure", async () => {
    const bytes = new TextEncoder().encode("not an xlsx zip");
    const url = "https://fixture.test/annual.xlsx";
    const snapshot = makeSnapshot(url, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    const adapter = new WvdepProductionSourceAdapter(new StaticSourceRetrievalProvider({ [url]: { snapshot, bytes } }), new WvdepAnnualWorkbookReader(), url);
    await assert.rejects(adapter.query({ apiNumber: "4700701733" }), (error: unknown) => error instanceof Error && error.name === "SourceAdapterError" && error.message.includes("Unable to read XLSX entry"));
  });
});

async function fixture(fileName: string, sourceName: string): Promise<[RetrievalSnapshot, Uint8Array, Array<{ normalizedFacts: Well }>]> {
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as { snapshots: SourceSnapshot[] };
  const snapshot = manifest.snapshots.find((item) => item.source.id === (sourceName === "wvdep-well" ? "wvdep-oog-rbdms-wells" : sourceName === "wvges-well" ? "wvges-oilgas-wells" : "wvdep-annual-production"));
  assert.ok(snapshot);
  const bytes = new Uint8Array(await readFile(join(root, "raw", fileName)));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), snapshot.contentHash);
  const expectedFile = sourceName === "wvdep-well" ? "normalized/wvdep-well.json" : sourceName === "wvges-well" ? "normalized/wvges-well.json" : "normalized/production.json";
  const expected = sourceName === "wvdep-production" ? [] : JSON.parse(await readFile(join(root, expectedFile), "utf8")) as Array<{ normalizedFacts: Well }>;
  return [{ ...snapshot, sourceId: snapshot.source.id }, bytes, expected];
}

function makeSnapshot(requestUrl: string, contentType: string, bytes = new Uint8Array([1]), sourceId = "wvdep-annual-production"): RetrievalSnapshot {
  return { snapshotId: `snapshot-${requestUrl}`, sourceId, requestUrl, retrievedAt: "2026-09-03T18:30:00.000Z", contentType, contentHash: createHash("sha256").update(bytes).digest("hex"), rawSnapshotRef: "fixture:test", byteLength: bytes.byteLength, immutable: true };
}
