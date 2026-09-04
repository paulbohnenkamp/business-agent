import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateLandPolicy } from "../src/evaluations/land-administration/policy";
import { wvEvaluationPolicy } from "../src/evaluations/jurisdictions/wv";
import { toLandProductionLookup, toLandProductionRecords, toLandWell } from "../src/domains/wv-land/projections";
import type { WvWellEvidence } from "../src/domains/wv-land/contracts";

test("shared land evaluation mechanics accept a second-jurisdiction-shaped policy without an adapter", () => {
  const ohioLike = { jurisdictionId: "oh", allowedRoutes: ["human-review"], isTitleProof: (assertion: string) => assertion.includes("title") };
  assert.deepEqual(evaluateLandPolicy(ohioLike, { route: "human-review", assertion: "administrative review" }), []);
  assert.deepEqual(evaluateLandPolicy(ohioLike, { route: "continue", assertion: "title" }), ["route-not-allowed", "public-evidence-is-not-title-proof"]);
});

test("WV facts project into minimal shared land concepts without losing publisher extensions", () => {
  const evidence = { evidenceId: "e-1", snapshotId: "s-1", sourceRecordId: "objectid:1", source: { id: "wvdep", publisher: "WVDEP", dataset: "wells", mechanism: "arcgis-rest", authorityScope: "test" }, sourceUrl: "https://example.test/wells", retrievedAt: "2026-09-04T00:00:00Z", contentHash: "a".repeat(64), rawSnapshotRef: "snapshot.json", normalizedFacts: { apiNumber: "4700701733", wellNumber: "3-S-245", county: "Braxton", evidenceIds: ["e-1"], productionEvidenceIds: [], farmOrLeaseName: "Lease", operatorAtCompletion: "Historical", measuredDepth: 10, }, warnings: [] } satisfies WvWellEvidence;
  const well = toLandWell(evidence);
  assert.equal(well.wellId, "4700701733");
  assert.equal(well.extensions?.farmOrLeaseName, "Lease");
  const records = toLandProductionRecords({ productionRecordId: "p-1", apiNumber: "4700701733", period: { year: 2025 }, gasMcf: 0, evidenceId: "e-2" });
  assert.deepEqual(records[0], { productionRecordId: "p-1", wellId: "4700701733", period: { year: 2025 }, value: 0, unit: "MCF", matchStatus: "reported", evidenceId: "e-2" });
  assert.equal(toLandProductionLookup({ status: "no-evidence", aggregates: [], evidenceIds: [], reason: "No matching row" }).status, "no-match");
});

test("WV evaluation policy retains source independence and title-proof boundaries", () => {
  assert.deepEqual(evaluateLandPolicy(wvEvaluationPolicy, { sourceIds: ["wvdep-oog-rbdms-wells", "wvges-oilgas-wells"], route: "human-review", assertion: "public records support comparison" }), []);
  assert.deepEqual(evaluateLandPolicy(wvEvaluationPolicy, { sourceIds: ["wvdep-oog-rbdms-wells"], assertion: "title certified" }), ["source-independence", "public-evidence-is-not-title-proof"]);
});
