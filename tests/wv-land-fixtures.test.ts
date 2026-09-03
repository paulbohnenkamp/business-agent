import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { join } from "node:path";
import { WvLandJsonCodec } from "../src/domains/wv-land";

const fixtureRoot = join(process.cwd(), "fixtures/wv-land/braxton-4700701733");

type Manifest = {
  fixtureVersion: string;
  caseId: string;
  syntheticInput: boolean;
  snapshots: Array<Record<string, any>>;
};

/** Verifies byte-level fixture identity and Phase 1 compatibility without transport. */
class WvLandFixtureVerifier {
  constructor(private readonly root: string, private readonly codec: WvLandJsonCodec) {}

  async readManifest(): Promise<Manifest> {
    return JSON.parse(await readFile(join(this.root, "manifest.json"), "utf8")) as Manifest;
  }

  async verifySnapshot(snapshot: Record<string, any>): Promise<void> {
    const rawReference = String(snapshot.rawSnapshotRef);
    const rawPath = join(process.cwd(), rawReference);
    await access(rawPath);
    const bytes = await readFile(rawPath);
    assert.equal(bytes.byteLength, snapshot.byteLength, rawReference);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), snapshot.contentHash, rawReference);
    assert.equal(snapshot.immutable, true);
    assert.match(snapshot.requestUrl, /^https:\/\//);
    this.codec.decodeSourceSnapshot(JSON.stringify(snapshot));
  }

  readRawJson(fileName: string): Record<string, any> {
    return JSON.parse(readFileSync(join(this.root, `raw/${fileName}`), "utf8")) as Record<string, any>;
  }

  workbookContainsApi(apiNumber: string): boolean {
    const rawPath = join(this.root, "raw/wvdep-production.xlsx");
    const worksheet = execFileSync("unzip", ["-p", rawPath, "xl/worksheets/sheet1.xml"], { maxBuffer: 200_000_000 }).toString();
    const sharedStrings = execFileSync("unzip", ["-p", rawPath, "xl/sharedStrings.xml"], { maxBuffer: 10_000_000 }).toString();
    const strings = [...sharedStrings.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => decodeXmlText(match[1].replace(/<[^>]+>/g, "")));
    const target = Number(apiNumber);
    for (const row of worksheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      for (const cell of row[1].matchAll(/<c\s+([^>]+)>([\s\S]*?)<\/c>/g)) {
        const value = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (value === undefined) continue;
        const decoded = cell[1].includes('t="s"') ? strings[Number(value)] : value;
        if (decoded !== undefined && Number(decoded) === target) return true;
      }
    }
    return false;
  }

  verifyWellEvidence(evidence: Record<string, any>): void {
    this.codec.decodeWellEvidence(JSON.stringify(evidence));
  }
}

describe("WV land Phase 2 fixtures", () => {
  const verifier = new WvLandFixtureVerifier(fixtureRoot, new WvLandJsonCodec());

  it("contains complete, hash-verified immutable public snapshots", async () => {
    const manifest = await verifier.readManifest();
    assert.equal(manifest.fixtureVersion, "1");
    assert.equal(manifest.caseId, "braxton-4700701733");
    assert.equal(manifest.syntheticInput, true);
    assert.deepEqual(new Set(manifest.snapshots.map((snapshot) => snapshot.source.id)), new Set(["wvdep-oog-rbdms-wells", "wvges-oilgas-wells", "wvdep-annual-production"]));
    assert.equal(new Set(manifest.snapshots.map((snapshot) => snapshot.snapshotId)).size, 3);
    for (const snapshot of manifest.snapshots) {
      assert.match(snapshot.snapshotId, /^snapshot-2026-09-03-/);
      assert.match(snapshot.retrievedAt, /^2026-09-03T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assert.ok(snapshot.parserVersion.length > 0);
      assert.match(snapshot.contentHash, /^[a-f0-9]{64}$/);
      assert.ok(Array.isArray(snapshot.sourceRecordIds));
      assert.ok(snapshot.rawSnapshotRef.startsWith("fixtures/wv-land/braxton-4700701733/raw/"));
      assert.match(snapshot.requestUrl, /^https:\/\//);
      await verifier.verifySnapshot(snapshot);
    }
    const bySource = new Map(manifest.snapshots.map((snapshot) => [snapshot.source.id, snapshot]));
    assert.deepEqual(bySource.get("wvdep-oog-rbdms-wells")?.sourceRecordIds, ["objectid:99486", "objectid:100001", "objectid:104461"]);
    assert.deepEqual(bySource.get("wvges-oilgas-wells")?.sourceRecordIds, ["OBJECTID:21403259", "OBJECTID:21403260"]);
    assert.deepEqual(bySource.get("wvdep-annual-production")?.sourceRecordIds, []);
  });

  it("keeps normalized public evidence source-linked and codec-valid", async () => {
    const manifest = await verifier.readManifest();
    const normalized = await Promise.all([
      readFile(join(fixtureRoot, "normalized/wvdep-well.json"), "utf8"),
      readFile(join(fixtureRoot, "normalized/wvges-well.json"), "utf8"),
    ]);
    const evidence = normalized.flatMap((serialized) => JSON.parse(serialized) as Array<Record<string, any>>);
    assert.equal(evidence.length, 5);
    const sources = new Set<string>();
    for (const item of evidence) {
      assertEvidenceLinksToManifest(item, manifest);
      sources.add(item.source.id);
      verifier.verifyWellEvidence(item);
    }
    assert.deepEqual(sources, new Set(["wvdep-oog-rbdms-wells", "wvges-oilgas-wells"]));
  });

  it("proves normalized facts correspond to publisher-specific raw records", async () => {
    const depRaw = verifier.readRawJson("wvdep-well.json").features as Array<Record<string, any>>;
    const gesRaw = verifier.readRawJson("wvges-well.geojson").features as Array<Record<string, any>>;
    const depNormalized = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvdep-well.json"), "utf8")) as Array<Record<string, any>>;
    const gesNormalized = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvges-well.json"), "utf8")) as Array<Record<string, any>>;
    for (const evidence of depNormalized) {
      const raw = depRaw.find((feature) => `objectid:${feature.properties.objectid}` === evidence.sourceRecordId);
      assert.ok(raw, evidence.sourceRecordId);
      const facts = evidence.normalizedFacts;
      assert.equal(facts.apiNumber, String(raw.properties.api));
      assert.equal(facts.permitId, raw.properties.permitid);
      assert.equal(facts.county, raw.properties.county);
      assert.equal(facts.wellNumber, raw.properties.wellnumber);
      assert.equal(facts.farmOrLeaseName, raw.properties.farmname);
      assert.equal(facts.operator, raw.properties.respparty);
      assert.equal(facts.status, raw.properties.wellstatus);
      assert.equal(facts.wellType, raw.properties.welltype);
      assert.equal(facts.issuedDate, raw.properties.issuedate?.replaceAll("/", "-"));
      assert.equal(facts.completedDate, raw.properties.compdate?.replaceAll("/", "-"));
      assert.equal(facts.surfaceLocation, undefined);
    }
    for (const evidence of gesNormalized) {
      const raw = gesRaw.find((feature) => `OBJECTID:${feature.properties.OBJECTID}` === evidence.sourceRecordId);
      assert.ok(raw, evidence.sourceRecordId);
      const facts = evidence.normalizedFacts;
      assert.equal(facts.apiNumber, String(raw.properties.api));
      assert.equal(facts.permitId, String(raw.properties.permit));
      assert.equal(facts.county, raw.properties.countyname);
      assert.equal(facts.operator, raw.properties.opernm);
      assert.equal(facts.sourceRecordType, raw.properties.suffixtr);
      assert.equal(facts.status, raw.properties.statustr);
      assertCoordinateApproximately(facts.surfaceLocation.latitude, raw.properties.lat_dd);
      assertCoordinateApproximately(facts.surfaceLocation.longitude, raw.properties.lon_dd);
      assert.equal(facts.surfaceLocation.datum, "WGS84");
      assert.equal(facts.farmOrLeaseName, raw.properties.lease ?? undefined);
      assert.equal(facts.wellNumber, raw.properties.well_num ?? raw.properties.co_num ?? undefined);
      assert.equal(facts.wellType, raw.properties.welltypetr ?? undefined);
      assert.equal(facts.formation, raw.properties.dfmnm ?? undefined);
      assert.equal(facts.measuredDepth, raw.properties.td ?? undefined);
    }
  });

  it("preserves source disagreement and independently proves workbook no-match", async () => {
    const dep = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvdep-well.json"), "utf8")) as Array<Record<string, any>>;
    const ges = JSON.parse(await readFile(join(fixtureRoot, "normalized/wvges-well.json"), "utf8")) as Array<Record<string, any>>;
    assert.equal(dep[1].normalizedFacts.operator, "ROSS AND WHARTON GAS COMPANY, INC.");
    assert.equal(ges[1].normalizedFacts.operator, "Ross & Wharton Gas Co., Inc.");
    assert.notEqual(dep[1].normalizedFacts.operator, ges[1].normalizedFacts.operator);
    assert.equal(ges[0].normalizedFacts.operator, "Stonestreet Lands Co.");
    assert.equal(verifier.workbookContainsApi("4700701733"), false);
    const production = JSON.parse(await readFile(join(fixtureRoot, "normalized/production.json"), "utf8")) as { resultType: string; records: unknown[]; selectionNote: string };
    assert.equal(production.resultType, "no-match");
    assert.deepEqual(production.records, []);
    assert.match(production.selectionNote, /no row/);
  });

  it("labels the submitted package synthetic and makes no title assertion", async () => {
    const input = JSON.parse(await readFile(join(fixtureRoot, "input/submitted-land-package.json"), "utf8")) as Record<string, unknown>;
    assert.equal(input.synthetic, true);
    assert.equal(input.titleAssertion, null);
    assert.deepEqual(input.claims, []);
  });
});

function assertEvidenceLinksToManifest(item: Record<string, any>, manifest: Manifest): void {
  const snapshot = manifest.snapshots.find((candidate) => candidate.snapshotId === item.snapshotId);
  assert.ok(snapshot);
  assert.ok(snapshot.sourceRecordIds.includes(item.sourceRecordId));
  assert.equal(item.rawSnapshotRef, snapshot.rawSnapshotRef);
  assert.equal(item.contentHash, snapshot.contentHash);
  assert.equal(item.sourceUrl, snapshot.requestUrl);
  assert.equal(item.retrievedAt, snapshot.retrievedAt);
  assert.ok(item.source.id === "wvdep-oog-rbdms-wells" || item.source.id === "wvges-oilgas-wells");
}

function decodeXmlText(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").trim();
}

function assertCoordinateApproximately(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) <= 1e-9, `${actual} does not correspond to ${expected}`);
}
