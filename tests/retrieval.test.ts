import assert from "node:assert/strict";
import { test } from "node:test";
import { chunkText, LocalDocumentRetriever, searchLocalDocuments } from "../src/retrieval/local";

test("local retrieval returns ranked results with provenance", async () => {
  const results = await searchLocalDocuments(["examples/land-records/case-lease-lifecycle.md", "examples/land-records/case-division-order.md"], "lease obligation", 1);
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, "case-lease-lifecycle.md");
  assert.equal(results[0]?.provenance[0]?.locator, "whole-document");
});

test("chunked local retrieval preserves chunk provenance", async () => {
  const chunks = chunkText("first paragraph\n\nsecond paragraph", 10);
  assert.equal(chunks.length, 2);
  const retriever = new LocalDocumentRetriever(["examples/land-records/case-lease-lifecycle.md"]);
  const result = await retriever.search("notice", 1);
  assert.match(result[0]?.provenance[0]?.locator ?? "", /chunk/);
});
