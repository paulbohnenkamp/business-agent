import type { RunRecord } from "./run-record";

export interface RunStore { save(record: RunRecord, root: string): Promise<void>; get(runId: string, root: string): Promise<RunRecord>; }
