import { readFile } from "node:fs/promises";

export async function loadJsonLines<T>(path: string, parse: (value: unknown, line: number) => T, label: string): Promise<readonly T[]> {
  const entries: T[] = [];
  const seen = new Set<string>();
  const lines = (await readFile(path, "utf8")).split("\n").map((line) => line.trim()).filter(Boolean);
  for (const [index, line] of lines.entries()) {
    let value: unknown;
    try { value = JSON.parse(line); } catch (error) { throw new Error(`Invalid ${label} JSON at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`); }
    const parsed = parse(value, index + 1);
    const id = typeof parsed === "object" && parsed !== null && "id" in parsed && typeof parsed.id === "string" ? parsed.id : undefined;
    if (id !== undefined) { if (seen.has(id)) throw new Error(`Duplicate ${label} case ID: ${id}`); seen.add(id); }
    entries.push(parsed);
  }
  return entries;
}
