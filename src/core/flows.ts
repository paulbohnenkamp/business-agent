import { join, resolve } from "node:path";
import { definitionId, listValue, markdownFiles, readDefinition } from "./definitions";

export interface FlowDefinition {
  id: string;
  version: string;
  path: string;
  description: string;
  inputs: string[];
  outputs: string[];
  agents: string[];
  body: string;
}

export function toFlowDefinition(definition: Awaited<ReturnType<typeof readDefinition>>): FlowDefinition {
  const version = definition.frontMatter.version;
  const description = definition.frontMatter.description;
  if (typeof version !== "string" || !version) throw new Error(`Flow ${definition.path} is missing version`);
  if (typeof description !== "string" || !description) throw new Error(`Flow ${definition.path} is missing description`);
  return { id: definitionId(definition), version, path: definition.path, description, inputs: listValue(definition, "inputs"), outputs: listValue(definition, "outputs"), agents: listValue(definition, "agents"), body: definition.body };
}

export async function loadFlows(root: string): Promise<Map<string, FlowDefinition>> {
  const files = await markdownFiles(join(resolve(root), "flows"), ".flow.md");
  const flows = new Map<string, FlowDefinition>();
  for (const path of files) {
    const flow = toFlowDefinition(await readDefinition(path));
    if (flows.has(flow.id)) throw new Error(`Duplicate flow ID: ${flow.id}`);
    flows.set(flow.id, flow);
  }
  return flows;
}

export function validateFlow(flow: FlowDefinition, agents: Map<string, unknown>): void {
  for (const agent of flow.agents) if (!agents.has(agent)) throw new Error(`Flow ${flow.id} references missing agent: ${agent}`);
}
