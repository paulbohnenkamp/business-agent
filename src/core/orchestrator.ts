import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AgentDefinition } from "./agents";
import type { FlowDefinition } from "./flows";
import { validateFlow } from "./flows";
import type { RunStore } from "./storage";
import type { RunRecord, ReviewStatus, RunStatus } from "./run-record";
import { validateAgentOutput, type AgentOutputEnvelope } from "./contracts";

export interface AgentExecutionResult {
  agentId: string;
  status: "complete" | "failed";
  output: string;
  error?: string;
  structured?: AgentOutputEnvelope;
}

export interface AgentExecutor {
  execute(agent: AgentDefinition, context: string, inputs: Readonly<Record<string, string>>): Promise<AgentExecutionResult>;
}

export class MockExecutor implements AgentExecutor {
  async execute(agent: AgentDefinition, context: string): Promise<AgentExecutionResult> {
    return { agentId: agent.id, status: "complete", output: `# ${agent.id}\n\n- Status: complete\n- Context received: ${context.slice(0, 120)}` };
  }
}

function runId(now: Date): string {
  return `run-${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface RunOptions {
  root: string;
  domain: string;
  flow: FlowDefinition;
  agents: Map<string, AgentDefinition>;
  context: string;
  inputs?: Readonly<Record<string, string>>;
  executor?: AgentExecutor;
  maxAttempts?: number;
}

export class RunService {
  constructor(private readonly store: RunStore, private readonly defaultExecutor: AgentExecutor = new MockExecutor(), private readonly clock: () => Date = () => new Date()) {}

  async runFlow(options: RunOptions): Promise<RunRecord> {
  validateFlow(options.flow, options.agents);
  const id = runId(this.clock());
  const directory = join(resolve(options.root), "runs", id);
  const startedAt = this.clock().toISOString();
  const record: RunRecord = { id, domain: options.domain, flow: options.flow.id, flowVersion: options.flow.version, status: "running", startedAt, agents: options.flow.agents.map((agentId) => ({ id: agentId, version: options.agents.get(agentId)?.version ?? "unknown" })), outputs: [], errors: [], reviewStatus: "pending-human-review", handoffs: [] };
  await mkdir(join(directory, "agents"), { recursive: true });
  await writeFile(join(directory, "input.md"), options.context, "utf8");
  const executor = options.executor ?? this.defaultExecutor;
  let workingContext = options.context;
  let previousAgent = "input";
  for (const agentId of options.flow.agents) {
    const agent = options.agents.get(agentId);
    if (!agent) throw new Error(`Missing agent: ${agentId}`);
    let result: AgentExecutionResult = { agentId: agent.id, status: "failed", output: "", error: "not attempted" };
    const attempts = Math.max(1, options.maxAttempts ?? 1);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      result = await executor.execute(agent, workingContext, options.inputs ?? {});
      if (result.status === "complete" || attempt === attempts) break;
    }
    const outputPath = join(directory, "agents", `${agent.id}.md`);
    await writeFile(outputPath, result.output, "utf8");
    if (result.structured) {
      try { validateAgentOutput(result.structured); }
      catch (error) { result = { agentId: agent.id, status: "failed", output: result.output, error: error instanceof Error ? error.message : String(error) }; }
    }
    if (result.status === "failed") {
      record.status = "failed";
      record.errors.push(`${agent.id}: ${result.error ?? "agent failed"}`);
      break;
    }
    record.outputs.push(outputPath);
    record.handoffs.push({ from: previousAgent, to: agent.id, outputPath });
    previousAgent = agent.id;
    workingContext = `${workingContext}\n\n## Prior agent output: ${agent.id}\n\n${result.output}`;
  }
  record.status = record.status === "failed" ? "failed" : "complete";
  record.completedAt = this.clock().toISOString();
  await this.store.save(record, options.root);
  return record;
  }

  async updateReviewStatus(root: string, runIdValue: string, status: Exclude<ReviewStatus, "not-required">): Promise<RunRecord> {
  const record = await this.store.get(runIdValue, root);
  if (record.reviewStatus !== "pending-human-review") throw new Error(`Run ${runIdValue} is not awaiting human review`);
  record.reviewStatus = status;
  await this.store.save(record, root);
  return record;
  }
}

export async function runFlow(options: RunOptions, store: RunStore): Promise<RunRecord> {
  return new RunService(store, options.executor).runFlow(options);
}

export async function updateReviewStatus(root: string, runIdValue: string, status: Exclude<ReviewStatus, "not-required">, store: RunStore): Promise<RunRecord> {
  return new RunService(store).updateReviewStatus(root, runIdValue, status);
}

export type { RunRecord, ReviewStatus, RunStatus } from "./run-record";
