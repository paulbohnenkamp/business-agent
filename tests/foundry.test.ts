import assert from "node:assert/strict";
import { test } from "node:test";
import { createFoundryExecutor, FoundryClient } from "../src/microsoft/foundry";
import type { AgentDefinition } from "../src/core/agents";

const agent = { id: "foundry-agent", version: "1.0.0", path: "test", description: "test", inputs: [], outputs: [], referencedSkills: [], permittedTools: [], body: "instructions" } satisfies AgentDefinition;

test("Foundry adapter sends the Responses request and parses output", async () => {
  let request: RequestInit | undefined;
  const executor = createFoundryExecutor({ endpoint: "https://example.test", apiKey: "key", model: "model", fetcher: async (_url, init) => { request = init; return new Response(JSON.stringify({ output_text: "grounded result" }), { status: 200 }); } });
  const result = await executor.execute(agent, "context", {});
  assert.equal(result.status, "complete");
  assert.equal(result.output, "grounded result");
  assert.match(String(request?.headers && (request.headers as Record<string, string>).authorization), /Bearer key/);
});

test("FoundryClient is independently usable as the provider boundary", async () => {
  const client = new FoundryClient({ endpoint: "https://example.test/", apiKey: "key", model: "model", fetcher: async () => new Response(JSON.stringify({ output_text: "client result" }), { status: 200 }) });
  assert.deepEqual(await client.respond("instructions", "input"), { ok: true, status: 200, text: "client result" });
});

test("Foundry adapter returns an auditable failure on provider errors", async () => {
  const executor = createFoundryExecutor({ endpoint: "https://example.test", apiKey: "key", model: "model", fetcher: async () => new Response("", { status: 503 }) });
  const result = await executor.execute(agent, "context", {});
  assert.equal(result.status, "failed");
  assert.match(result.error ?? "", /503/);
});
