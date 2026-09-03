import assert from "node:assert/strict";
import { test } from "node:test";
import { AzureSearchRetriever } from "../src/retrieval/azure-search";

test("Azure AI Search adapter maps results to provenance records", async () => {
  const retriever = new AzureSearchRetriever({ endpoint: "https://search.test", index: "land", apiKey: "key", fetcher: async () => new Response(JSON.stringify({ value: [{ id: "doc-1", content: "lease text", "@search.score": 2.5, source: "blob/doc-1" }] }), { status: 200 }) });
  const result = await retriever.search("lease");
  assert.deepEqual(result[0]?.provenance[0], { source: "blob/doc-1", locator: "doc-1" });
});
