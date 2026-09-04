import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { FileWvLandRunStore, WvLandRunService, validateWvFlowResult, type WvLandRunAggregate } from "../src/domains/wv-land";
import type { RunRecord } from "../src/core/run-record";
import type { RunStore } from "../src/core/storage";
import type { Conflict, Finding, SourceSnapshot, Unknown, WvEvidence, WvFlowResult, SubmittedLandPackage } from "../src/domains/wv-land";

const caseId = "synthetic-phase-6-case";
const submittedPackage: SubmittedLandPackage = { caseId, synthetic: true, clues: { apiNumber: "4700701733" }, claims: ["synthetic well clue"], titleAssertion: null };
const source = { id: "fixture-source", publisher: "Fixture publisher", dataset: "wells", mechanism: "arcgis-rest" as const, authorityScope: "reported public evidence" };
const snapshot: SourceSnapshot = { snapshotId: "snapshot-phase-6-a", source, requestUrl: "https://fixture.test/wells", retrievedAt: "2026-09-03T00:00:00Z", contentType: "application/json", contentHash: "a".repeat(64), rawSnapshotRef: "fixture:phase-6-a", byteLength: 10, immutable: true };
const evidence: WvEvidence = { evidenceId: "evidence-phase-6-a", snapshotId: snapshot.snapshotId, source, sourceRecordId: "4700701733", sourceUrl: snapshot.requestUrl, retrievedAt: snapshot.retrievedAt, contentHash: snapshot.contentHash, rawSnapshotRef: snapshot.rawSnapshotRef, normalizedFacts: { apiNumber: "4700701733", productionEvidenceIds: [], evidenceIds: ["evidence-phase-6-a"] }, warnings: [] };
const finding: Finding = { findingId: "finding-phase-6-a", caseId, subject: "well identity", assertion: "The submitted API clue is supported by the public record.", status: "supported", confidence: "medium", evidenceIds: [evidence.evidenceId], conflictIds: ["conflict-phase-6-a"], unknownIds: ["unknown-phase-6-a"], provenance: { runId: "run-phase-6-a", stepId: "land-well-reconciler", inputRecordIds: [evidence.sourceRecordId], sourceEvidenceIds: [evidence.evidenceId], producerVersion: "test-1" }, producer: "test-executor", producedAt: "2026-09-03T00:00:00Z" };
const conflict: Conflict = { conflictId: "conflict-phase-6-a", subject: "operator", claims: [{ value: "WVDEP operator", evidenceIds: [evidence.evidenceId] }, { value: "WVGES operator", evidenceIds: [evidence.evidenceId] }], reason: "Independent publisher values differ.", status: "unresolved", createdAt: "2026-09-03T00:00:00Z" };
const unknown: Unknown = { unknownId: "unknown-phase-6-a", subject: "title", question: "Does public evidence establish title?", reason: "Public well evidence is not title evidence.", neededEvidence: ["county deed"], createdAt: "2026-09-03T00:00:00Z" };

function result(runId = "run-phase-6-a", status: WvFlowResult["status"] = "complete", evidenceId = evidence.evidenceId, snapshotId = snapshot.snapshotId): WvFlowResult {
  const currentFinding = { ...finding, evidenceIds: [evidenceId], provenance: { ...finding.provenance, runId, sourceEvidenceIds: [evidenceId] } };
  const currentConflict = { ...conflict, claims: conflict.claims.map((claim) => ({ ...claim, evidenceIds: [evidenceId] })) };
  const reconciliation = { kind: "reconciliation" as const, caseId, findings: [currentFinding], conflicts: [currentConflict], unknowns: [unknown], evidenceRefs: [evidenceId, snapshotId], route: "human-review" as const };
  const synthesis = { kind: "synthesis" as const, caseId, findings: [currentFinding], conflicts: [conflict], unknowns: [unknown], evidenceRefs: reconciliation.evidenceRefs, synthesis: "Evidence remains subject to human review.", proposedRoute: "human-review" as const };
  if (status === "failed") return { flowId: "wv-land-well-reconciliation", caseId, status, steps: [{ status: "failed", stepId: "land-well-reconciler", kind: "execution", error: "source execution failed" }, { status: "blocked", stepId: "case-synthesizer", kind: "execution", error: "blocked by failure" }], findings: [], conflicts: [], unknowns: [], evidenceRefs: [], executionFailure: { stepId: "land-well-reconciler", kind: "execution", message: "source execution failed" } };
  return { flowId: "wv-land-well-reconciliation", caseId, status, steps: [{ status: "succeeded", stepId: "land-well-reconciler", artifact: reconciliation }, { status: "succeeded", stepId: "case-synthesizer", artifact: synthesis }], findings: [currentFinding], conflicts: [currentConflict], unknowns: [unknown], evidenceRefs: reconciliation.evidenceRefs, synthesis };
}

const options = { flowVersion: "1.0", startedAt: "2026-09-03T00:00:00Z", completedAt: "2026-09-03T00:01:00Z" };

async function tempRoot(): Promise<string> { return mkdtemp(join(tmpdir(), "business-agent-phase-6-")); }

describe("WV land Phase 6 persistence", () => {
  it("persists and reloads the complete structured aggregate", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      const saved = await store.saveRun({ ...options, runId: "run-phase-6-a", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result() });
      const loaded = await store.getRun(caseId, saved.runId);
      assert.deepEqual(loaded, saved);
      assert.deepEqual(loaded.result.findings[0], finding);
      assert.deepEqual(loaded.result.conflicts[0], conflict);
      assert.deepEqual(loaded.result.unknowns[0], unknown);
      assert.deepEqual(loaded.snapshotIds, [snapshot.snapshotId]);
      assert.deepEqual(loaded.judgments.scope, { caseId, runId: saved.runId });
      assert.equal(loaded.result.synthesis?.proposedRoute, "human-review");
      assert.equal((await store.getReviewPacket(caseId, saved.runId)).state, "pending-human-review");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("inherits judgment scope from the aggregate and rejects cross-run scope", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      const saved = await store.saveRun({ ...options, runId: "run-scoped", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-scoped") });
      const path = join(root, "cases", caseId, "runs", saved.runId, "aggregate.json");
      const tampered = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
      tampered.judgments = { ...(tampered.judgments as Record<string, unknown>), scope: { caseId, runId: "other-run" } };
      await writeFile(path, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");
      await assert.rejects(() => store.getRun(caseId, saved.runId), /Invalid persisted WV land aggregate envelope/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("keeps two historical runs and snapshot sets independently retrievable", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      await store.saveRun({ ...options, runId: "run-phase-6-a", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result() });
      const laterSnapshot = { ...snapshot, snapshotId: "snapshot-phase-6-b", contentHash: "b".repeat(64), rawSnapshotRef: "fixture:phase-6-b" };
      const laterEvidence = { ...evidence, evidenceId: "evidence-phase-6-b", snapshotId: laterSnapshot.snapshotId, contentHash: laterSnapshot.contentHash, rawSnapshotRef: laterSnapshot.rawSnapshotRef };
      await store.saveRun({ ...options, runId: "run-phase-6-b", submittedPackage, sourceSnapshots: [laterSnapshot], sourceEvidence: [laterEvidence], result: result("run-phase-6-b", "complete", laterEvidence.evidenceId, laterSnapshot.snapshotId) });
      const runs = await store.listCaseRuns(caseId);
      assert.deepEqual(runs.map((run) => run.runId), ["run-phase-6-a", "run-phase-6-b"]);
      assert.equal((await store.getRun(caseId, "run-phase-6-a")).snapshotIds[0], snapshot.snapshotId);
      assert.equal((await store.getRun(caseId, "run-phase-6-b")).snapshotIds[0], laterSnapshot.snapshotId);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("fails closed for malformed state and broken identity/reference relationships", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      await store.saveRun({ ...options, runId: "run-phase-6-a", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result() });
      const aggregatePath = join(root, "cases", caseId, "runs", "run-phase-6-a", "aggregate.json");
      await writeFile(aggregatePath, "{not-json}", "utf8");
      await assert.rejects(() => store.getRun(caseId, "run-phase-6-a"));
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-b", submittedPackage, sourceSnapshots: [], sourceEvidence: [evidence], result: result("run-phase-6-b") }), /missing snapshot/);
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-c", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-c"), caseId: "different-case" } as never), /case identity/);
      await assert.rejects(() => store.saveRun({ ...options, runId: "../unsafe", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("../unsafe") }), /path characters/);
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-safe", submittedPackage: { ...submittedPackage, caseId: "../unsafe-case" }, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-safe") }), /path characters/);
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-a", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result() }), /EEXIST/);
      await assert.rejects(() => store.recordReviewDecision(caseId, "run-phase-6-a", { decisionId: "../unsafe-decision", reviewerId: "reviewer", decision: "approved", reason: "unsafe", decidedAt: "2026-09-03T00:02:00Z" }), /path characters/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects impossible result states and broken finding relationships", async () => {
    const invalidStatus = { ...result(), status: "complete" as const, executionFailure: { stepId: "x", kind: "execution" as const, message: "failure" } };
    assert.equal(validateWvFlowResult(invalidStatus), false);
    const failedWithSynthesis = { ...result("run-phase-6-failed", "failed"), synthesis: result().synthesis };
    assert.equal(validateWvFlowResult(failedWithSynthesis), false);
    const missingConflictBase = result("run-missing-conflict");
    const missingConflict = { ...missingConflictBase, findings: [{ ...missingConflictBase.findings[0], conflictIds: ["missing-conflict"] }] };
    await assert.rejects(() => new FileWvLandRunStore("/tmp/phase-6-unused").saveRun({ ...options, runId: "run-missing-conflict", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: missingConflict }), /missing conflict/);
    const missingUnknownBase = result("run-missing-unknown");
    const missingUnknown = { ...missingUnknownBase, findings: [{ ...missingUnknownBase.findings[0], unknownIds: ["missing-unknown"] }] };
    await assert.rejects(() => new FileWvLandRunStore("/tmp/phase-6-unused").saveRun({ ...options, runId: "run-missing-unknown", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: missingUnknown }), /missing unknown/);
    const mismatchedFindingBase = result("run-mismatched-finding");
    const mismatchedFinding = { ...mismatchedFindingBase, findings: [{ ...mismatchedFindingBase.findings[0], caseId: "other-case" }] };
    await assert.rejects(() => new FileWvLandRunStore("/tmp/phase-6-unused").saveRun({ ...options, runId: "run-mismatched-finding", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: mismatchedFinding }), /Invalid persisted/);
    const mismatchedProvenance = result("run-bad-provenance");
    const badProvenance = { ...mismatchedProvenance, findings: [{ ...mismatchedProvenance.findings[0], provenance: { ...mismatchedProvenance.findings[0].provenance, runId: "other-run" } }] };
    await assert.rejects(() => new FileWvLandRunStore("/tmp/phase-6-unused").saveRun({ ...options, runId: "run-bad-provenance", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: badProvenance }), /wrong run ID/);
  });

  it("rejects evidence whose existing snapshot has inconsistent provenance", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      const inconsistentEvidence = { ...evidence, source: { ...source, publisher: "Different publisher" } };
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-inconsistent-evidence", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [inconsistentEvidence], result: result("run-inconsistent-evidence") }), /provenance/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects JSON-lossy step artifacts before publishing any canonical run", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      const invalid = { ...result("run-lossy"), steps: [{ ...result("run-lossy").steps[0], artifact: { dropped: undefined } }, result("run-lossy").steps[1]] };
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-lossy", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: invalid }), /JSON-lossy/);
      await assert.rejects(() => store.getRun(caseId, "run-lossy"));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("preserves execution failure and does not create an eligible review packet", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      await store.saveRun({ ...options, runId: "run-phase-6-failed", submittedPackage, sourceSnapshots: [], sourceEvidence: [], result: result("run-phase-6-failed", "failed") });
      const loaded = await store.getRun(caseId, "run-phase-6-failed");
      assert.equal(loaded.result.status, "failed");
      assert.equal(loaded.result.executionFailure?.kind, "execution");
      await assert.rejects(() => store.getReviewPacket(caseId, "run-phase-6-failed"), /not eligible/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("records append-only approval, rejection, revision requests, and new-run lineage", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      await store.saveRun({ ...options, runId: "run-phase-6-a", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result() });
      const pending = await store.getReviewPacket(caseId, "run-phase-6-a");
      assert.equal(pending.state, "pending-human-review");
      const original = JSON.stringify(await store.getRun(caseId, "run-phase-6-a"));
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-pending-revision", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-pending-revision"), revisionOfRunId: "run-phase-6-a", revisionOfPacketId: pending.packet.reviewPacketId }), /revision request/);
      const revised = await store.recordReviewDecision(caseId, "run-phase-6-a", { decisionId: "decision-revise", reviewerId: "reviewer-1", decision: "revision-requested", reason: "Need a newer source snapshot.", decidedAt: "2026-09-03T00:02:00Z" });
      assert.equal(revised.state, "revision-requested");
      assert.equal(revised.decisions.length, 1);
      await assert.rejects(() => store.recordReviewDecision(caseId, "run-phase-6-a", { decisionId: "decision-approve", reviewerId: "reviewer-1", decision: "approved", reason: "not allowed after revision request", decidedAt: "2026-09-03T00:03:00Z" }), /already/);
      await store.saveRun({ ...options, runId: "run-phase-6-b", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-b"), revisionOfRunId: "run-phase-6-a", revisionOfPacketId: pending.packet.reviewPacketId });
      const newPacket = await store.getReviewPacket(caseId, "run-phase-6-b");
      assert.equal(newPacket.state, "pending-human-review");
      assert.equal(newPacket.packet.revisionOfPacketId, pending.packet.reviewPacketId);
      assert.equal(JSON.stringify(await store.getRun(caseId, "run-phase-6-a")), original);
      assert.equal((await store.getRun(caseId, "run-phase-6-a")).reviewPacketId, pending.packet.reviewPacketId);
      await store.saveRun({ ...options, runId: "run-phase-6-e", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-e") });
      const approved = await store.recordReviewDecision(caseId, "run-phase-6-e", { decisionId: "decision-approved-parent", reviewerId: "reviewer", decision: "approved", reason: "approved", decidedAt: "2026-09-03T00:06:00Z" });
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-f", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-f"), revisionOfRunId: "run-phase-6-e", revisionOfPacketId: approved.packet.reviewPacketId }), /revision request/);
      await store.saveRun({ ...options, runId: "run-phase-6-g", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-g") });
      const rejected = await store.recordReviewDecision(caseId, "run-phase-6-g", { decisionId: "decision-rejected-parent", reviewerId: "reviewer", decision: "rejected", reason: "rejected", decidedAt: "2026-09-03T00:07:00Z" });
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-h", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-h"), revisionOfRunId: "run-phase-6-g", revisionOfPacketId: rejected.packet.reviewPacketId }), /revision request/);
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-i", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-i"), revisionOfRunId: "run-phase-6-a", revisionOfPacketId: "wrong-packet" }), /revision request/);
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-phase-6-j", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-j"), revisionOfRunId: "run-from-other-case", revisionOfPacketId: pending.packet.reviewPacketId }), /ENOENT/);
      await store.saveRun({ ...options, runId: "run-phase-6-c", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-c") });
      const rejectedC = await store.recordReviewDecision(caseId, "run-phase-6-c", { decisionId: "decision-reject", reviewerId: "reviewer-2", decision: "rejected", reason: "Evidence is insufficient.", decidedAt: "2026-09-03T00:04:00Z" });
      assert.equal(rejectedC.state, "rejected");
      await store.saveRun({ ...options, runId: "run-phase-6-d", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-phase-6-d") });
      const approvedD = await store.recordReviewDecision(caseId, "run-phase-6-d", { decisionId: "decision-approve", reviewerId: "reviewer-3", decision: "approved", reason: "Reviewed the evidence packet.", decidedAt: "2026-09-03T00:05:00Z" });
      assert.equal(approvedD.state, "approved");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("integrates a generic run-history reference without invoking consequential actions", async () => {
    const root = await tempRoot();
    try {
      const store = new FileWvLandRunStore(root);
      const service = new WvLandRunService(store);
      await assert.rejects(() => service.persist({ ...options, root: join(root, "different-root"), runId: "run-wrong-root", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-wrong-root") }), /same root/);
      const saved = await service.persist({ ...options, root, runId: "run-phase-6-a", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result() });
      const runRecord = JSON.parse(await readFile(join(root, "runs", saved.runId, "run.json"), "utf8")) as { caseId?: string; structuredResultRef?: string; sourceSnapshotIds?: string[]; reviewPacketRef?: string };
      assert.equal(runRecord.caseId, caseId);
      assert.equal(runRecord.structuredResultRef, join("cases", caseId, "runs", saved.runId, "aggregate.json"));
      assert.deepEqual(runRecord.sourceSnapshotIds, [snapshot.snapshotId]);
      assert.equal(runRecord.reviewPacketRef, join("cases", caseId, "runs", saved.runId, "review-packet.json"));
      const reviewed = await service.recordReviewDecision(root, caseId, saved.runId, { decisionId: "decision-approve", reviewerId: "reviewer-1", decision: "approved", reason: "Reviewed.", decidedAt: "2026-09-03T00:02:00Z" });
      assert.equal(reviewed.state, "approved");
      const updatedRun = JSON.parse(await readFile(join(root, "runs", saved.runId, "run.json"), "utf8")) as { reviewStatus?: string };
      assert.equal(updatedRun.reviewStatus, "approved");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("does not expose an aggregate after generic run publication fails", async () => {
    const root = await tempRoot();
    try {
      const failingRunStore: RunStore = { async save(_record: RunRecord, _root: string): Promise<void> { throw new Error("injected publication failure"); }, async get(_runId: string, _root: string): Promise<RunRecord> { throw Object.assign(new Error("missing"), { code: "ENOENT" }); } };
      const store = new FileWvLandRunStore(root, failingRunStore);
      await assert.rejects(() => store.saveRun({ ...options, runId: "run-publication-failure", submittedPackage, sourceSnapshots: [snapshot], sourceEvidence: [evidence], result: result("run-publication-failure") }), /publication failure/);
      await assert.rejects(() => store.getRun(caseId, "run-publication-failure"), /missing/);
      const recovered = await new FileWvLandRunStore(root).recoverRun(caseId, "run-publication-failure");
      assert.equal(recovered.runId, "run-publication-failure");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
