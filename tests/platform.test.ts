import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSkills } from "../src/core/skills";
import { ToolInputValidationError, ToolPermissionError, ToolRegistry } from "../src/core/tools";
import { mcpCatalog, validateMcpCatalog } from "../src/mcp/catalog";
import { BlockedActionGateway, NoopTelemetry } from "../src/core/ports";

test("loads domain skills from Markdown definitions", async () => {
  const skills = await loadSkills("domains/land-administration");
  assert.deepEqual([...skills.keys()], ["assignment-transfer-review", "division-order-preparation", "land-package-triage", "lease-lifecycle-review", "lease-obligation-analysis", "ownership-interest-reconciliation", "ownership-verification", "parcel-record-analysis", "title-chain-review"]);
});

test("tool registry enforces the agent permission list", async () => {
  const registry = new ToolRegistry();
  registry.register({ name: "read-case", description: "Read a case", inputSchema: { type: "object", required: ["caseId"] }, async execute() { return { name: "read-case", output: "ok", provenance: ["case.md"] }; } });
  await assert.rejects(() => registry.call({ name: "read-case", input: {} }, []), ToolPermissionError);
  await assert.rejects(() => registry.call({ name: "read-case", input: {} }, ["read-case"]), ToolInputValidationError);
  assert.deepEqual(await registry.call({ name: "read-case", input: { caseId: "LA-100" } }, ["read-case"]), { name: "read-case", output: "ok", provenance: ["case.md"] });
});

test("MCP catalog exposes only permitted object-schema tools", () => {
  const catalog = mcpCatalog([{ name: "read-case", description: "Read a case", inputSchema: { type: "object", required: ["caseId"] }, async execute() { return { name: "read-case", output: "", provenance: [] }; } }], ["read-case"]);
  validateMcpCatalog(catalog, ["read-case"]);
  assert.throws(() => validateMcpCatalog([{ name: "write-case", description: "Write a case", inputSchema: { type: "object" } }], ["read-case"]), /forbidden/);
});

test("local defaults do not emit telemetry or perform consequential actions", async () => {
  await new NoopTelemetry().event("test");
  assert.deepEqual(await new BlockedActionGateway().execute("send-owner-email", {}), { status: "blocked", reason: "Consequential actions require an approved gateway." });
});
