import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

test("README and documentation map expose the implemented learning path", async () => {
  const readme = await readFile("README.md", "utf8");
  const map = await readFile("docs/README.md", "utf8");
  for (const required of ["docs/architecture.md", "docs/data-model.md", "docs/flow-runtime.md", "docs/evaluations.md", "docs/safety.md", "npm run eval"]) assert.match(readme, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const required of ["quickstart.md", "architecture.md", "evaluations.md", "MICROSOFT-STACK.md", "prompts/README.md"]) assert.match(map, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await access("domains/land-administration/catalog.yaml");
});
