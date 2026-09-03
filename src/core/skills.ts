import { join, resolve } from "node:path";
import { definitionId, listValue, markdownFiles, readDefinition } from "./definitions";

export interface SkillDefinition {
  id: string;
  version: string;
  description: string;
  path: string;
  referencedTools: string[];
  body: string;
}

export function toSkillDefinition(definition: Awaited<ReturnType<typeof readDefinition>>): SkillDefinition {
  const version = definition.frontMatter.version;
  const description = definition.frontMatter.description;
  if (typeof version !== "string" || !version) throw new Error(`Skill ${definition.path} is missing version`);
  if (typeof description !== "string" || !description) throw new Error(`Skill ${definition.path} is missing description`);
  return { id: definitionId(definition), version, description, path: definition.path, referencedTools: listValue(definition, "permitted-tools"), body: definition.body };
}

export async function loadSkills(root: string): Promise<Map<string, SkillDefinition>> {
  const files = await markdownFiles(join(resolve(root), "skills"), "SKILL.md");
  const skills = new Map<string, SkillDefinition>();
  for (const path of files) {
    const skill = toSkillDefinition(await readDefinition(path));
    if (skills.has(skill.id)) throw new Error(`Duplicate skill ID: ${skill.id}`);
    skills.set(skill.id, skill);
  }
  return skills;
}
