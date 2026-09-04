import { link, mkdir, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { RunRecord } from "../../core/run-record";
import type { RunStore } from "../../core/storage";
import { FileRunStore } from "../../storage/file-run-store";
import { WvLandJsonCodec } from "./serialization";
import { validateWvFlowResult, type SubmittedLandPackage, type WvEvidence, type WvFlowResult } from "./flow";
import type { SourceSnapshot } from "./contracts";

export type ReviewState = "pending-human-review" | "approved" | "rejected" | "revision-requested";
export type ReviewDecisionKind = Exclude<ReviewState, "pending-human-review">;
export type WvRoute = "continue" | "request-records" | "human-review";

export interface ReviewPacket {
  readonly reviewPacketId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly resultRef: string;
  readonly proposedRoute: WvRoute;
  readonly snapshotIds: readonly string[];
  readonly createdAt: string;
  readonly revisionOfPacketId?: string;
}

export interface ReviewDecision {
  readonly decisionId: string;
  readonly reviewPacketId: string;
  readonly caseId: string;
  readonly runId: string;
  readonly resultRef: string;
  readonly snapshotIds: readonly string[];
  readonly reviewerId: string;
  readonly decision: ReviewDecisionKind;
  readonly reason: string;
  readonly decidedAt: string;
  readonly revisesPacketId?: string;
}

export interface ReviewPacketView {
  readonly packet: ReviewPacket;
  readonly state: ReviewState;
  readonly decisions: readonly ReviewDecision[];
}

export interface WvLandRunAggregate {
  readonly schemaVersion: "1.0";
  readonly caseId: string;
  readonly runId: string;
  readonly flowVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly submittedPackage: SubmittedLandPackage;
  readonly sourceSnapshots: readonly SourceSnapshot[];
  readonly sourceEvidence: readonly WvEvidence[];
  readonly result: WvFlowResult;
  readonly snapshotIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly revisionOfRunId?: string;
  readonly reviewPacketId?: string;
}

export interface PersistRunOptions {
  readonly runId: string;
  readonly flowVersion: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly revisionOfRunId?: string;
  readonly revisionOfPacketId?: string;
}

export interface WvLandRunStore {
  saveRun(input: {
    readonly submittedPackage: SubmittedLandPackage;
    readonly sourceSnapshots: readonly SourceSnapshot[];
    readonly sourceEvidence: readonly WvEvidence[];
    readonly result: WvFlowResult;
  } & PersistRunOptions): Promise<WvLandRunAggregate>;
  getRun(caseId: string, runId: string): Promise<WvLandRunAggregate>;
  recoverRun(caseId: string, runId: string): Promise<WvLandRunAggregate>;
  listCaseRuns(caseId: string): Promise<readonly WvLandRunAggregate[]>;
  getReviewPacket(caseId: string, runId: string): Promise<ReviewPacketView>;
  recordReviewDecision(caseId: string, runId: string, input: {
    readonly decisionId: string;
    readonly reviewerId: string;
    readonly decision: ReviewDecisionKind;
    readonly reason: string;
    readonly decidedAt: string;
  }): Promise<ReviewPacketView>;
}

export class FileWvLandRunStore implements WvLandRunStore {
  private readonly root: string;
  private readonly runStore: RunStore;

  constructor(root: string, runStore: RunStore = new FileRunStore()) {
    this.root = resolve(root);
    this.runStore = runStore;
  }

  async saveRun(input: {
    readonly submittedPackage: SubmittedLandPackage;
    readonly sourceSnapshots: readonly SourceSnapshot[];
    readonly sourceEvidence: readonly WvEvidence[];
    readonly result: WvFlowResult;
  } & PersistRunOptions): Promise<WvLandRunAggregate> {
    assertSafeId(input.submittedPackage.caseId, "case ID");
    assertSafeId(input.runId, "run ID");
    validateAggregateInput(input);
    const snapshotIds = input.sourceSnapshots.map((snapshot) => snapshot.snapshotId);
    const evidenceIds = input.sourceEvidence.map((evidence) => evidence.evidenceId);
    const reviewable = input.result.status === "complete" && input.result.synthesis !== undefined;
    const reviewPacketId = reviewable ? "review-" + input.runId : undefined;
    const aggregate: WvLandRunAggregate = {
      schemaVersion: "1.0",
      caseId: input.submittedPackage.caseId,
      runId: input.runId,
      flowVersion: input.flowVersion,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      submittedPackage: input.submittedPackage,
      sourceSnapshots: input.sourceSnapshots,
      sourceEvidence: input.sourceEvidence,
      result: input.result,
      snapshotIds,
      evidenceIds,
      ...(input.revisionOfRunId === undefined ? {} : { revisionOfRunId: input.revisionOfRunId }),
      ...(reviewPacketId === undefined ? {} : { reviewPacketId }),
    };
    validateStoredAggregate(aggregate);
    if (input.revisionOfRunId !== undefined) {
      const prior = await this.getRun(aggregate.caseId, input.revisionOfRunId);
      const priorReview = await this.getReviewPacket(aggregate.caseId, input.revisionOfRunId);
      if (prior.reviewPacketId === undefined || input.revisionOfPacketId !== prior.reviewPacketId || priorReview.state !== "revision-requested") throw new Error("Revision lineage requires the prior packet's revision request");
    } else if (input.revisionOfPacketId !== undefined) {
      throw new Error("Revision packet reference requires a prior run");
    }
    const runDirectory = this.runDirectory(aggregate.caseId, aggregate.runId);
    await mkdir(join(runDirectory, "review-decisions"), { recursive: true });
    const canonicalAggregate = canonicalJson(aggregate);
    await writeNewAtomic(join(runDirectory, "aggregate.json"), canonicalAggregate);
    if (reviewPacketId !== undefined) {
      const packet: ReviewPacket = {
        reviewPacketId,
        caseId: aggregate.caseId,
        runId: aggregate.runId,
        resultRef: this.resultRef(aggregate.caseId, aggregate.runId),
        proposedRoute: input.result.synthesis!.proposedRoute,
        snapshotIds,
        createdAt: input.completedAt,
        ...(input.revisionOfPacketId === undefined ? {} : { revisionOfPacketId: input.revisionOfPacketId }),
      };
      await writeNewAtomic(join(runDirectory, "review-packet.json"), JSON.stringify(packet, null, 2) + "\n");
    }
    await this.runStore.save(runRecordFor(aggregate, this.resultRef(aggregate.caseId, aggregate.runId)), this.root);
    return deepFreeze(aggregate as WvLandRunAggregate);
  }

  async getRun(caseId: string, runId: string): Promise<WvLandRunAggregate> {
    assertSafeId(caseId, "case ID");
    assertSafeId(runId, "run ID");
    const aggregate = JSON.parse(await readFile(join(this.runDirectory(caseId, runId), "aggregate.json"), "utf8")) as unknown;
    validateStoredAggregate(aggregate);
    if (aggregate.caseId !== caseId || aggregate.runId !== runId) throw new Error("Persisted run identity does not match its lookup");
    const run = await this.runStore.get(runId, this.root);
    validateRunRecord(run, aggregate, this.resultRef(caseId, runId));
    return deepFreeze(aggregate as WvLandRunAggregate);
  }

  async recoverRun(caseId: string, runId: string): Promise<WvLandRunAggregate> {
    assertSafeId(caseId, "case ID");
    assertSafeId(runId, "run ID");
    const aggregate = JSON.parse(await readFile(join(this.runDirectory(caseId, runId), "aggregate.json"), "utf8")) as unknown;
    validateStoredAggregate(aggregate);
    if (aggregate.caseId !== caseId || aggregate.runId !== runId) throw new Error("Persisted run identity does not match its lookup");
    if (aggregate.reviewPacketId !== undefined) {
      const packet = JSON.parse(await readFile(join(this.runDirectory(caseId, runId), "review-packet.json"), "utf8")) as ReviewPacket;
      validatePacket(packet, aggregate);
    }
    await this.runStore.save(runRecordFor(aggregate, this.resultRef(caseId, runId)), this.root);
    return this.getRun(caseId, runId);
  }

  async listCaseRuns(caseId: string): Promise<readonly WvLandRunAggregate[]> {
    assertSafeId(caseId, "case ID");
    const directory = join(this.root, "cases", caseId, "runs");
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    const runs: WvLandRunAggregate[] = [];
    for (const entry of entries.filter((item) => item.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) runs.push(await this.getRun(caseId, entry.name));
    return runs;
  }

  async getReviewPacket(caseId: string, runId: string): Promise<ReviewPacketView> {
    assertSafeId(caseId, "case ID");
    assertSafeId(runId, "run ID");
    const aggregate = await this.getRun(caseId, runId);
    if (aggregate.reviewPacketId === undefined) throw new Error("Run is not eligible for human review");
    const packet = JSON.parse(await readFile(join(this.runDirectory(caseId, runId), "review-packet.json"), "utf8")) as ReviewPacket;
    validatePacket(packet, aggregate);
    const decisions = await this.readDecisions(caseId, runId, packet);
    return deepFreeze({ packet, state: decisions.length === 0 ? "pending-human-review" : decisions[decisions.length - 1].decision, decisions });
  }

  async recordReviewDecision(caseId: string, runId: string, input: {
    readonly decisionId: string;
    readonly reviewerId: string;
    readonly decision: ReviewDecisionKind;
    readonly reason: string;
    readonly decidedAt: string;
  }): Promise<ReviewPacketView> {
    assertSafeId(caseId, "case ID");
    assertSafeId(runId, "run ID");
    assertSafeId(input.decisionId, "decision ID");
    const current = await this.getReviewPacket(caseId, runId);
    if (current.state !== "pending-human-review") throw new Error("Review packet is already " + current.state);
    if (input.reviewerId.trim() === "" || input.reason.trim() === "") throw new Error("Reviewer and reason are required");
    const decision: ReviewDecision = {
      decisionId: input.decisionId,
      reviewPacketId: current.packet.reviewPacketId,
      caseId,
      runId,
      resultRef: current.packet.resultRef,
      snapshotIds: current.packet.snapshotIds,
      reviewerId: input.reviewerId,
      decision: input.decision,
      reason: input.reason,
      decidedAt: input.decidedAt,
      ...(input.decision === "revision-requested" ? { revisesPacketId: current.packet.reviewPacketId } : {}),
    };
    await writeNewAtomic(join(this.runDirectory(caseId, runId), "review-decisions", input.decisionId + ".json"), JSON.stringify(decision, null, 2) + "\n");
    const run = await this.runStore.get(runId, this.root);
    run.reviewStatus = input.decision;
    await this.runStore.save(run, this.root);
    return this.getReviewPacket(caseId, runId);
  }

  persistenceRoot(): string { return this.root; }

  private async readDecisions(caseId: string, runId: string, packet: ReviewPacket): Promise<ReviewDecision[]> {
    const directory = join(this.runDirectory(caseId, runId), "review-decisions");
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    const decisions: ReviewDecision[] = [];
    for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json")).sort((left, right) => left.name.localeCompare(right.name))) {
      const decision = JSON.parse(await readFile(join(directory, entry.name), "utf8")) as ReviewDecision;
      validateDecision(decision, packet);
      decisions.push(decision);
    }
    return decisions;
  }

  private runDirectory(caseId: string, runId: string): string {
    return join(this.root, "cases", caseId, "runs", runId);
  }

  private resultRef(caseId: string, runId: string): string {
    return join("cases", caseId, "runs", runId, "aggregate.json");
  }
}

export class WvLandRunService {
  constructor(private readonly store: FileWvLandRunStore) {}

  async persist(input: {
    readonly root: string;
    readonly submittedPackage: SubmittedLandPackage;
    readonly sourceSnapshots: readonly SourceSnapshot[];
    readonly sourceEvidence: readonly WvEvidence[];
    readonly result: WvFlowResult;
  } & PersistRunOptions): Promise<WvLandRunAggregate> {
    if (resolve(input.root) !== this.storeRoot()) throw new Error("WV aggregate and generic run stores must use the same root");
    return this.store.saveRun(input);
  }

  async recordReviewDecision(root: string, caseId: string, runId: string, input: {
    readonly decisionId: string;
    readonly reviewerId: string;
    readonly decision: ReviewDecisionKind;
    readonly reason: string;
    readonly decidedAt: string;
  }): Promise<ReviewPacketView> {
    if (resolve(root) !== this.storeRoot()) throw new Error("WV aggregate and generic run stores must use the same root");
    return this.store.recordReviewDecision(caseId, runId, input);
  }

  private storeRoot(): string { return this.store.persistenceRoot(); }
}

function validateAggregateInput(value: unknown): asserts value is {
  readonly submittedPackage: SubmittedLandPackage;
  readonly sourceSnapshots: readonly SourceSnapshot[];
  readonly sourceEvidence: readonly WvEvidence[];
  readonly result: WvFlowResult;
  readonly snapshotIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly reviewPacketId?: string;
  readonly caseId?: string;
  readonly runId?: string;
} {
  if (!isRecord(value) || !isSubmittedPackage(value.submittedPackage) || !Array.isArray(value.sourceSnapshots) || !Array.isArray(value.sourceEvidence) || !validateWvFlowResult(value.result)) throw new Error("Invalid persisted WV land aggregate");
  const caseId = value.submittedPackage.caseId;
  if (value.result.caseId !== caseId || (value.caseId !== undefined && value.caseId !== caseId)) throw new Error("Aggregate case identity mismatch");
  const snapshots = new Map<string, SourceSnapshot>();
  for (const snapshot of value.sourceSnapshots) {
    const decoded = new WvLandJsonCodec().decodeSourceSnapshot(JSON.stringify(snapshot));
    if (snapshots.has(decoded.snapshotId)) throw new Error("Duplicate source snapshot ID");
    snapshots.set(decoded.snapshotId, decoded);
  }
  const evidence = new Map<string, WvEvidence>();
  for (const item of value.sourceEvidence) {
    const decoded = decodeEvidence(item);
    if (evidence.has(decoded.evidenceId)) throw new Error("Duplicate evidence ID");
    const snapshot = snapshots.get(decoded.snapshotId);
    if (snapshot === undefined) throw new Error("Evidence references a missing snapshot");
    if (JSON.stringify(decoded.source) !== JSON.stringify(snapshot.source) || decoded.sourceUrl !== snapshot.requestUrl || decoded.retrievedAt !== snapshot.retrievedAt || decoded.contentHash !== snapshot.contentHash || decoded.rawSnapshotRef !== snapshot.rawSnapshotRef || decoded.effectiveDate !== snapshot.effectiveDate || decoded.publicationDate !== snapshot.publicationDate) throw new Error("Evidence provenance does not match its snapshot");
    evidence.set(decoded.evidenceId, decoded);
  }
  const references = new Set([...snapshots.keys(), ...evidence.keys()]);
  for (const reference of value.result.evidenceRefs) if (!references.has(reference)) throw new Error("Result references missing evidence or snapshot: " + reference);
  const conflictIds = new Set(value.result.conflicts.map((conflict) => conflict.conflictId));
  const unknownIds = new Set(value.result.unknowns.map((unknown) => unknown.unknownId));
  for (const finding of value.result.findings) {
    if (value.runId !== undefined && finding.provenance.runId !== value.runId) throw new Error("Finding has the wrong run ID");
    for (const id of finding.evidenceIds) if (!evidence.has(id)) throw new Error("Finding references missing evidence");
    for (const id of finding.provenance.sourceEvidenceIds) if (!evidence.has(id)) throw new Error("Finding provenance references missing evidence");
    for (const id of finding.conflictIds) if (!conflictIds.has(id)) throw new Error("Finding references missing conflict");
    for (const id of finding.unknownIds) if (!unknownIds.has(id)) throw new Error("Finding references missing unknown");
  }
  for (const conflict of value.result.conflicts) for (const claim of conflict.claims) for (const id of claim.evidenceIds) if (!evidence.has(id)) throw new Error("Conflict references missing evidence");
}

function validateStoredAggregate(value: unknown): asserts value is WvLandRunAggregate {
  if (!isRecord(value) || value.schemaVersion !== "1.0" || typeof value.caseId !== "string" || typeof value.runId !== "string" || typeof value.flowVersion !== "string" || !isTimestamp(value.startedAt) || !isTimestamp(value.completedAt) || !Array.isArray(value.snapshotIds) || !isStringArray(value.snapshotIds) || !Array.isArray(value.evidenceIds) || !isStringArray(value.evidenceIds) || (value.revisionOfRunId !== undefined && typeof value.revisionOfRunId !== "string") || (value.reviewPacketId !== undefined && typeof value.reviewPacketId !== "string")) throw new Error("Invalid persisted WV land aggregate envelope");
  validateAggregateInput(value);
  if (value.snapshotIds === undefined || value.evidenceIds === undefined) throw new Error("Persisted aggregate association index is missing");
  const expectedSnapshotIds = value.sourceSnapshots.map((snapshot) => snapshot.snapshotId);
  const expectedEvidenceIds = value.sourceEvidence.map((item) => item.evidenceId);
  if (JSON.stringify(value.snapshotIds) !== JSON.stringify(expectedSnapshotIds) || JSON.stringify(value.evidenceIds) !== JSON.stringify(expectedEvidenceIds)) throw new Error("Persisted aggregate association index does not match its records");
  if (value.result.caseId !== value.caseId || value.runId.trim() === "") throw new Error("Persisted aggregate identity mismatch");
  const reviewable = value.result.status === "complete" && value.result.synthesis !== undefined;
  if (reviewable !== (value.reviewPacketId !== undefined)) throw new Error("Persisted review eligibility does not match the flow result");
}

function runRecordFor(aggregate: WvLandRunAggregate, resultRef: string): RunRecord {
  return {
    id: aggregate.runId,
    domain: "land-administration",
    flow: aggregate.result.flowId,
    flowVersion: aggregate.flowVersion,
    status: aggregate.result.status,
    startedAt: aggregate.startedAt,
    completedAt: aggregate.completedAt,
    agents: [],
    outputs: [],
    errors: aggregate.result.executionFailure === undefined ? [] : [aggregate.result.executionFailure.message],
    reviewStatus: aggregate.reviewPacketId === undefined ? "not-required" : "pending-human-review",
    handoffs: [],
    caseId: aggregate.caseId,
    structuredResultRef: resultRef,
    sourceSnapshotIds: [...aggregate.snapshotIds],
    ...(aggregate.reviewPacketId === undefined ? {} : { reviewPacketRef: join("cases", aggregate.caseId, "runs", aggregate.runId, "review-packet.json") }),
  };
}

function validateRunRecord(run: RunRecord, aggregate: WvLandRunAggregate, resultRef: string): void {
  if (run.id !== aggregate.runId || run.caseId !== aggregate.caseId || run.flow !== aggregate.result.flowId || run.flowVersion !== aggregate.flowVersion || run.status !== aggregate.result.status || run.structuredResultRef !== resultRef || JSON.stringify(run.sourceSnapshotIds ?? []) !== JSON.stringify(aggregate.snapshotIds) || (aggregate.reviewPacketId === undefined ? run.reviewPacketRef !== undefined || run.reviewStatus !== "not-required" : run.reviewPacketRef === undefined || !["pending-human-review", "approved", "rejected", "revision-requested"].includes(run.reviewStatus))) throw new Error("Generic run record does not match the WV aggregate");
}

function decodeEvidence(value: WvEvidence): WvEvidence {
  const codec = new WvLandJsonCodec();
  return "productionRecordId" in value.normalizedFacts ? codec.decodeProductionEvidence(JSON.stringify(value)) : codec.decodeWellEvidence(JSON.stringify(value));
}

function canonicalJson(value: WvLandRunAggregate): string {
  assertJsonSafe(value);
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new Error("Aggregate cannot be serialized");
  const parsed = JSON.parse(serialized) as unknown;
  validateStoredAggregate(parsed);
  return serialized + "\n";
}

function assertJsonSafe(value: unknown, seen = new Set<object>()): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new Error("Aggregate contains a JSON-lossy value");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Aggregate contains a non-finite number");
  if (typeof value !== "object" || value === null) return;
  if (seen.has(value)) throw new Error("Aggregate contains a circular value");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) throw new Error("Aggregate contains an unsupported object");
  seen.add(value);
  for (const child of Object.values(value)) assertJsonSafe(child, seen);
  seen.delete(value);
}

function validatePacket(packet: ReviewPacket, aggregate: WvLandRunAggregate): void {
  if (!isRecord(packet) || typeof packet.reviewPacketId !== "string" || typeof packet.caseId !== "string" || typeof packet.runId !== "string" || typeof packet.resultRef !== "string" || !isStringArray(packet.snapshotIds) || !isTimestamp(packet.createdAt) || (packet.revisionOfPacketId !== undefined && typeof packet.revisionOfPacketId !== "string") || !["continue", "request-records", "human-review"].includes(packet.proposedRoute) || packet.reviewPacketId !== aggregate.reviewPacketId || packet.caseId !== aggregate.caseId || packet.runId !== aggregate.runId || packet.resultRef !== join("cases", aggregate.caseId, "runs", aggregate.runId, "aggregate.json") || JSON.stringify(packet.snapshotIds) !== JSON.stringify(aggregate.snapshotIds) || aggregate.result.synthesis === undefined || packet.proposedRoute !== aggregate.result.synthesis.proposedRoute) throw new Error("Invalid review packet relationship");
}

function validateDecision(decision: ReviewDecision, packet: ReviewPacket): void {
  if (!isRecord(decision) || typeof decision.decisionId !== "string" || typeof decision.reviewerId !== "string" || typeof decision.reason !== "string" || !isTimestamp(decision.decidedAt) || !isStringArray(decision.snapshotIds) || (decision.revisesPacketId !== undefined && typeof decision.revisesPacketId !== "string") || decision.reviewPacketId !== packet.reviewPacketId || decision.caseId !== packet.caseId || decision.runId !== packet.runId || decision.resultRef !== packet.resultRef || JSON.stringify(decision.snapshotIds) !== JSON.stringify(packet.snapshotIds) || !["approved", "rejected", "revision-requested"].includes(decision.decision)) throw new Error("Invalid review decision relationship");
}

function isSubmittedPackage(value: unknown): value is SubmittedLandPackage {
  return isRecord(value) && typeof value.caseId === "string" && value.synthetic === true && isStringRecord(value.clues) && isStringArray(value.claims) && value.titleAssertion === null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringRecord(value: unknown): value is Record<string, string | undefined> {
  return isRecord(value) && Object.values(value).every((item) => item === undefined || typeof item === "string");
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

function assertSafeId(value: string, label: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) throw new Error(label + " contains unsupported path characters");
}

async function writeNewAtomic(path: string, content: string): Promise<void> {
  const temporary = path + "." + randomUUID() + ".tmp";
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, content, "utf8");
  try {
    await link(temporary, path);
    await unlink(temporary);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
