export type RunStatus = "running" | "complete" | "incomplete" | "failed";
export type ReviewStatus = "not-required" | "pending-human-review" | "approved" | "rejected" | "revision-requested";

export interface RunRecord {
  id: string;
  domain: string;
  flow: string;
  flowVersion: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  agents: Array<{ id: string; version: string }>;
  outputs: string[];
  errors: string[];
  reviewStatus: ReviewStatus;
  handoffs: Array<{ from: string; to: string; outputPath: string }>;
  /** Generic references for structured domain run artifacts. */
  caseId?: string;
  structuredResultRef?: string;
  sourceSnapshotIds?: string[];
  reviewPacketRef?: string;
}
