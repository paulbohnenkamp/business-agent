import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadAgents } from "../src/core/agents";
import { loadFlows } from "../src/core/flows";
import { loadSkills } from "../src/core/skills";

test("land-administration catalog covers every loaded definition", async () => {
  const root = "domains/land-administration";
  const catalog = await readFile(`${root}/catalog.yaml`, "utf8");
  const [agents, skills, flows] = await Promise.all([loadAgents(root), loadSkills(root), loadFlows(root)]);
  for (const id of agents.keys()) assert.match(catalog, new RegExp(`id: ${id}\\n`));
  for (const id of skills.keys()) assert.match(catalog, new RegExp(`id: ${id}\\n`));
  for (const id of flows.keys()) assert.match(catalog, new RegExp(`id: ${id}\\n`));
});
