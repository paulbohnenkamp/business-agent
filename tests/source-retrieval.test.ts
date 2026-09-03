import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { HttpSourceRetrievalProvider, SourceRetrievalError, StaticSourceRetrievalProvider, type RetrievalSnapshot } from "../src/retrieval/source";

const source = { id: "test-source" };

describe("source retrieval providers", () => {
  it("hashes the exact bytes returned by HTTP and records response metadata", async () => {
    const bytes = new TextEncoder().encode("exact bytes");
    const provider = new HttpSourceRetrievalProvider(async () => new Response(bytes, { status: 200, headers: { "content-type": "application/json" } }));
    const result = await provider.retrieve("https://example.test/data", source);
    assert.equal(result.snapshot.sourceId, "test-source");
    assert.equal(result.snapshot.contentHash, createHash("sha256").update(bytes).digest("hex"));
    assert.equal(result.snapshot.byteLength, bytes.byteLength);
    assert.deepEqual(result.bytes, bytes);
  });

  it("converts HTTP status, read, size, and timeout failures to typed errors", async () => {
    const status = new HttpSourceRetrievalProvider(async () => new Response("no", { status: 503 }));
    await assert.rejects(status.retrieve("https://example.test/status", source), (error: unknown) => error instanceof SourceRetrievalError && error.kind === "status");

    const readFailure = new HttpSourceRetrievalProvider(async () => ({ ok: true, status: 200, headers: new Headers(), body: null, arrayBuffer: async () => { throw new Error("read failed"); } }) as unknown as Response);
    await assert.rejects(readFailure.retrieve("https://example.test/read", source), (error: unknown) => error instanceof SourceRetrievalError && error.kind === "transport");

    const oversized = new HttpSourceRetrievalProvider(async () => new Response("12345", { status: 200, headers: { "content-length": "5" } }), { maxBytes: 4 });
    await assert.rejects(oversized.retrieve("https://example.test/size", source), (error: unknown) => error instanceof SourceRetrievalError && error.kind === "size");

    const timeout = new HttpSourceRetrievalProvider(async (_url, init) => await new Promise<never>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))), { timeoutMs: 5 });
    await assert.rejects(timeout.retrieve("https://example.test/timeout", source), (error: unknown) => error instanceof SourceRetrievalError && error.kind === "timeout");
  });

  it("rejects static snapshots whose metadata does not match their bytes", async () => {
    const bytes = new TextEncoder().encode("bytes");
    const snapshot: RetrievalSnapshot = { snapshotId: "snapshot-test", sourceId: source.id, requestUrl: "https://example.test/data", retrievedAt: "2026-09-03T00:00:00.000Z", contentType: "text/plain", contentHash: "0".repeat(64), rawSnapshotRef: "fixture:test", byteLength: bytes.byteLength, immutable: true };
    const provider = new StaticSourceRetrievalProvider({ [snapshot.requestUrl]: { snapshot, bytes } });
    await assert.rejects(provider.retrieve(snapshot.requestUrl, source), (error: unknown) => error instanceof SourceRetrievalError && error.kind === "snapshot");
  });
});
