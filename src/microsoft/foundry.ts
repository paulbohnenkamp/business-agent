import type { AgentDefinition } from "../core/agents";
import type { AgentExecutor, AgentExecutionResult } from "../core/orchestrator";

export interface FoundryExecutorOptions {
  endpoint: string;
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

interface ResponsesPayload { output_text?: string; }

export class FoundryClient {
  private readonly fetcher: typeof fetch;
  constructor(private readonly options: FoundryExecutorOptions) { this.fetcher = options.fetcher ?? fetch; }

  async respond(instructions: string, input: string): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000);
    let response: Response;
    try {
      response = await this.fetcher(`${this.options.endpoint.replace(/\/$/, "")}/openai/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.options.apiKey}` },
      body: JSON.stringify({ model: this.options.model, instructions, input }),
      signal: controller.signal,
      });
    } catch (error) {
      return { ok: false, status: 0, text: "", error: `Foundry request error: ${error instanceof Error ? error.message : String(error)}` };
    } finally { clearTimeout(timeout); }
    if (!response.ok) return { ok: false, status: response.status, text: "", error: `Foundry request failed: ${response.status}` };
    const payload = await response.json() as ResponsesPayload;
    return { ok: true, status: response.status, text: payload.output_text ?? "" };
  }
}

export function createFoundryExecutor(options: FoundryExecutorOptions): AgentExecutor {
  const client = new FoundryClient(options);
  return {
    async execute(agent: AgentDefinition, context: string): Promise<AgentExecutionResult> {
      const response = await client.respond(agent.body, context);
      if (!response.ok) return { agentId: agent.id, status: "failed", output: "", error: response.error };
      return { agentId: agent.id, status: "complete", output: response.text };
    },
  };
}
