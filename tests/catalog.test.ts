import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadActiveCatalog } from "../src/core/catalog";

test("land-administration active catalog exposes only the Phase 5 surface", async () => {
  const root = "domains/land-administration";
  const catalog = await readFile(`${root}/catalog.yaml`, "utf8");
  const activeAgents = ["land-case-intake", "land-well-reconciler", "case-synthesizer"];
  const activeSkills = ["lease-obligation-analysis", "lease-lifecycle-review", "ownership-verification", "assignment-transfer-review"];
  const activeFlows = ["wv-land-well-reconciliation"];
  for (const id of [...activeAgents, ...activeSkills, ...activeFlows]) assert.match(catalog, new RegExp(`id: ${id}\\n`));
  for (const id of ["intake-reviewer", "ownership-reviewer", "land-package-review", "parcel-transfer-review", "division-order-preparation"]) assert.doesNotMatch(catalog, new RegExp(`id: ${id}\\n`));
  const active = await loadActiveCatalog(root);
  assert.deepEqual([...active.agents.keys()].sort(), [...activeAgents].sort());
  assert.deepEqual([...active.skills.keys()].sort(), [...activeSkills].sort());
  assert.deepEqual([...active.flows.keys()], activeFlows);
});
