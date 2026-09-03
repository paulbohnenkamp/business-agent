import { join, resolve } from "node:path";
import { loadAgents } from "../../../src/core/agents";
import { loadFlows } from "../../../src/core/flows";
import { loadSkills } from "../../../src/core/skills";

export async function GET(): Promise<Response> {
  const root = join(resolve(process.env.BUSINESS_AGENT_DOMAINS_ROOT ?? "domains"), "land-administration");
  const [agents, skills, flows] = await Promise.all([loadAgents(root), loadSkills(root), loadFlows(root)]);
  return Response.json({ domain: "land-administration", agents: [...agents.values()].map(({ id, description, version }) => ({ id, description, version })), skills: [...skills.values()].map(({ id, description, version }) => ({ id, description, version })), flows: [...flows.values()].map(({ id, description, version }) => ({ id, description, version })) });
}
