import { readFile } from "node:fs/promises";
import { loadAgents, type AgentDefinition } from "./agents";
import { loadFlows, type FlowDefinition } from "./flows";
import { loadSkills, type SkillDefinition } from "./skills";

export interface ActiveCatalog { readonly agents: ReadonlyMap<string, AgentDefinition>; readonly flows: ReadonlyMap<string, FlowDefinition>; readonly skills: ReadonlyMap<string, SkillDefinition>; }

/** Loads only definitions named by the domain's active catalog manifest. */
export async function loadActiveCatalog(root: string): Promise<ActiveCatalog> {
  const text = await readFile(`${root}/catalog.yaml`, "utf8");
  const ids = (section: string): Set<string> => { const start = text.indexOf(`${section}:`); const end = text.indexOf("\n\n", start); const block = text.slice(start, end < 0 ? text.length : end); return new Set([...block.matchAll(/^\s+- id: ([^\n]+)/gm)].map((match) => match[1])); };
  const [agents, flows, skills] = await Promise.all([loadAgents(root), loadFlows(root), loadSkills(root)]);
  return { agents: select(agents, ids("agents")), flows: select(flows, ids("flows")), skills: select(skills, ids("skills")) };
}

function select<T>(values: Map<string, T>, active: Set<string>): ReadonlyMap<string, T> { return new Map([...values].filter(([id]) => active.has(id))); }
