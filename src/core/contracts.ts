export interface AgentOutputEnvelope {
  schemaVersion: "1.0";
  agentId: string;
  status: "complete" | "blocked" | "failed";
  findings: Array<{ key: string; value: unknown; sources: string[]; confidence?: "high" | "medium" | "low" | "unknown" }>;
  unknowns: string[];
  conflicts: string[];
  route: "continue" | "request-records" | "human-review";
}

export function validateAgentOutput(value: unknown): AgentOutputEnvelope {
  if (!value || typeof value !== "object") throw new Error("Agent output must be an object");
  const output = value as Partial<AgentOutputEnvelope>;
  if (output.schemaVersion !== "1.0" || typeof output.agentId !== "string" || !Array.isArray(output.findings) || !Array.isArray(output.unknowns) || !Array.isArray(output.conflicts)) throw new Error("Invalid agent output envelope");
  if (!(["complete", "blocked", "failed"] as const).includes(output.status as never)) throw new Error("Invalid agent output status");
  if (!(["continue", "request-records", "human-review"] as const).includes(output.route as never)) throw new Error("Invalid agent output route");
  return output as AgentOutputEnvelope;
}
