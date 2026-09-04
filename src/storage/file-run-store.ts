import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RunRecord } from "../core/run-record";
import type { RunStore } from "../core/storage";
import { encodeCanonicalJson, writeAtomic } from "./file-primitives";

export class FileRunStore implements RunStore {
  async save(record: RunRecord, root: string): Promise<void> {
    await writeAtomic(join(resolve(root), "runs", record.id, "run.json"), encodeCanonicalJson(record));
  }

  async get(runId: string, root: string): Promise<RunRecord> {
    return JSON.parse(await readFile(join(resolve(root), "runs", runId, "run.json"), "utf8")) as RunRecord;
  }

  async saveInput(root: string, runId: string, content: string): Promise<void> {
    await writeAtomic(join(resolve(root), "runs", runId, "input.md"), content);
  }

  async saveAgentOutput(root: string, runId: string, agentId: string, content: string): Promise<string> {
    const path = join(resolve(root), "runs", runId, "agents", `${agentId}.md`);
    await writeAtomic(path, content);
    return path;
  }
}
