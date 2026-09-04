import { link, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

/** Write-once publication used by concrete stores and aggregate repositories. */
export async function writeNewAtomic(path: string, content: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, content, "utf8");
  try { await link(temporary, path); await unlink(temporary); }
  catch (error) { await rm(temporary, { force: true }); throw error; }
}

export function encodeCanonicalJson(value: unknown): string {
  assertJsonSafe(value);
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new Error("Value cannot be serialized");
  return `${serialized}\n`;
}

export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function assertJsonSafe(value: unknown, seen = new Set<object>()): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new Error("Value contains a JSON-lossy value");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Value contains a non-finite number");
  if (typeof value !== "object" || value === null) return;
  if (seen.has(value)) throw new Error("Value contains a circular value");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) throw new Error("Value contains an unsupported object");
  seen.add(value);
  for (const child of Object.values(value)) assertJsonSafe(child, seen);
  seen.delete(value);
}
