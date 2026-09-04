import type { RetrievedDocument } from "../core/ports";

export interface AzureSearchOptions { endpoint: string; index: string; apiKey: string; fetcher?: typeof fetch; }

export class AzureSearchRetriever {
  private readonly fetcher: typeof fetch;
  constructor(private readonly options: AzureSearchOptions) { this.fetcher = options.fetcher ?? fetch; }
  async search(query: string, limit = 5): Promise<RetrievedDocument[]> {
    const response = await this.fetcher(`${this.options.endpoint.replace(/\/$/, "")}/indexes/${this.options.index}/docs/search?api-version=2024-07-01`, { method: "POST", headers: { "content-type": "application/json", "api-key": this.options.apiKey }, body: JSON.stringify({ search: query, top: limit }) });
    if (!response.ok) throw new Error(`Azure AI Search request failed: ${response.status}`);
    const payload = await response.json() as { value?: Array<{ id?: string; content?: string; "@search.score"?: number; source?: string }> };
    return (payload.value ?? []).map((item) => ({ id: item.id ?? "unknown", text: item.content ?? "", score: item["@search.score"] ?? 0, provenance: [{ source: item.source ?? "azure-ai-search", locator: item.id ?? "unknown" }] }));
  }
}
