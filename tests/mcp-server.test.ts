import assert from "node:assert/strict";
import { test } from "node:test";
import { handleMcpRequest } from "../src/mcp/server";
import { ToolRegistry } from "../src/core/tools";

test("MCP-shaped handler lists and calls only permitted tools", async () => {
  const registry = new ToolRegistry();
  registry.register({ name: "read-case", description: "Read case", inputSchema: { type: "object", required: ["caseId"] }, async execute(input) { return { name: "read-case", output: input.caseId, provenance: ["case.json"] }; } });
  const listed = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }, registry, ["read-case"]);
  assert.equal((listed.result as { tools: Array<{ name: string }> }).tools[0]?.name, "read-case");
  const called = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "read-case", arguments: { caseId: "LA-100" } } }, registry, ["read-case"]);
  assert.equal((called.result as { output: string }).output, "LA-100");
  const denied = await handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "write-case", arguments: {} } }, registry, ["read-case"]);
  assert.match(denied.error?.message ?? "", /not permitted/);
});
