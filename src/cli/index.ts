import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadActiveCatalog } from "../core/catalog";
import { loadConfig } from "../core/config";
import { runFlow } from "../core/orchestrator";

function usage(): string {
  return ["Usage:", "  npm run cli -- domain list", "  npm run cli -- agent list --domain <domain>", "  npm run cli -- flow list --domain <domain>", "  npm run cli -- run --domain <domain> --flow <flow> --context <path>", "  npm run cli -- run inspect <run-id>"].join("\n");
}

function requiredOption(args: string[], name: string): string {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`Missing ${name}\n${usage()}`);
  return value;
}

function domainsRoot(): string { return resolve(process.env.BUSINESS_AGENT_DOMAINS_ROOT ?? "domains"); }

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;
  if (!command) throw new Error(usage());
  const root = domainsRoot();
  if (command === "domain" && args[0] === "list") {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) console.log(entry.name);
    return;
  }
  if (command === "run" && args[0] === "inspect") {
    const id = args[1];
    if (!id) throw new Error(`Missing run ID\n${usage()}`);
    console.log(await readFile(join(loadConfig().workspacePath, "runs", id, "run.json"), "utf8"));
    return;
  }
  if (command !== "agent" && command !== "flow" && command !== "run") throw new Error(usage());
  const domain = requiredOption(args, "--domain");
  const domainRoot = join(root, domain);
  if (command === "agent" && args[0] === "list") {
    for (const id of (await loadActiveCatalog(domainRoot)).agents.keys()) console.log(id);
    return;
  }
  if (command === "flow" && args[0] === "list") {
    for (const id of (await loadActiveCatalog(domainRoot)).flows.keys()) console.log(id);
    return;
  }
  if (command === "run") {
    const flowId = requiredOption(args, "--flow");
    const contextPath = requiredOption(args, "--context");
    const catalog = await loadActiveCatalog(domainRoot);
    const agents = new Map(catalog.agents);
    const flow = catalog.flows.get(flowId);
    if (!flow) throw new Error(`Flow not found: ${flowId}`);
    const record = await runFlow({ root: loadConfig().workspacePath, domain, flow, agents, context: await readFile(resolve(contextPath), "utf8") });
    console.log(`Run ${record.id}: ${record.status}`);
    return;
  }
  throw new Error(usage());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
