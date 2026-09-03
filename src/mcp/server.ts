import type { ToolRegistry } from "../core/tools";

export interface McpRequest { jsonrpc: "2.0"; id: string | number; method: "tools/list" | "tools/call"; params?: { name?: string; arguments?: Record<string, unknown> }; }
export interface McpResponse { jsonrpc: "2.0"; id: string | number; result?: unknown; error?: { code: number; message: string }; }

/** Minimal stdio-independent MCP-shaped handler for contract tests and future transport wiring. */
export async function handleMcpRequest(request: McpRequest, registry: ToolRegistry, permittedTools: readonly string[]): Promise<McpResponse> {
  if (request.method === "tools/list") return { jsonrpc: "2.0", id: request.id, result: { tools: registry.definitions().filter((tool) => permittedTools.includes(tool.name)).map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema ?? { type: "object" } })) } };
  const name = request.params?.name;
  if (!name) return { jsonrpc: "2.0", id: request.id, error: { code: -32602, message: "Missing tool name" } };
  try { return { jsonrpc: "2.0", id: request.id, result: await registry.call({ name, input: request.params?.arguments ?? {} }, permittedTools) }; }
  catch (error) { return { jsonrpc: "2.0", id: request.id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } }; }
}
