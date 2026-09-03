import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "../app/api/catalog/route";

test("catalog API exposes the configured domain inventory", async () => {
  const response = await GET();
  const body = await response.json() as { domain: string; agents: unknown[]; skills: unknown[]; flows: unknown[] };
  assert.equal(response.status, 200);
  assert.equal(body.domain, "land-administration");
  assert.ok(body.agents.length >= 10);
  assert.ok(body.skills.length >= 8);
  assert.ok(body.flows.length >= 4);
});
