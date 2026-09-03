import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { RetrievalProvider } from "../core/ports";

export interface RetrievedDocument { id: string; text: string; score: number; provenance: { source: string; locator: string }[]; }

export function chunkText(text: string, maxCharacters = 1200): Array<{ text: string; locator: string }> {
  const paragraphs = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const chunks: Array<{ text: string; locator: string }> = [];
  let current = "";
  let index = 0;
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxCharacters) { chunks.push({ text: current, locator: `chunk-${index++}` }); current = ""; }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push({ text: current, locator: `chunk-${index}` });
  return chunks;
}

export class LocalDocumentRetriever implements RetrievalProvider {
  constructor(private readonly paths: readonly string[]) {}
  async search(query: string, limit = 5): Promise<RetrievedDocument[]> {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const results: RetrievedDocument[] = [];
    for (const path of this.paths) for (const chunk of chunkText(await readFile(path, "utf8"))) {
      const haystack = chunk.text.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      if (score > 0) results.push({ id: `${basename(path)}:${chunk.locator}`, text: chunk.text, score, provenance: [{ source: path, locator: chunk.locator }] });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export async function searchLocalDocuments(paths: readonly string[], query: string, limit = 5): Promise<RetrievedDocument[]> {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  const results: RetrievedDocument[] = [];
  for (const path of paths) {
    const text = await readFile(path, "utf8");
    const haystack = text.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    if (score > 0) results.push({ id: basename(path), text, score, provenance: [{ source: path, locator: "whole-document" }] });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
