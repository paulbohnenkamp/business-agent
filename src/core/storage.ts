import type { RunRecord } from "./run-record";

export interface RunStore {
  save(record: RunRecord, root: string): Promise<void>;
  get(runId: string, root: string): Promise<RunRecord>;
}
export interface RunArtifactStore extends RunStore {
  saveInput(root: string, runId: string, content: string): Promise<void>;
  saveAgentOutput(root: string, runId: string, agentId: string, content: string): Promise<string>;
}
