import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RunRecord } from "../core/run-record";
import type { RunStore } from "../core/storage";

export class FileRunStore implements RunStore {
  async save(record: RunRecord, root: string): Promise<void> {
    await mkdir(join(resolve(root), "runs", record.id), { recursive: true });
    await writeFile(join(resolve(root), "runs", record.id, "run.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }

  async get(runId: string, root: string): Promise<RunRecord> {
    return JSON.parse(await readFile(join(resolve(root), "runs", runId, "run.json"), "utf8")) as RunRecord;
  }
}
