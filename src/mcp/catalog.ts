import type { ToolDefinition } from "../core/tools";

export interface McpToolDescriptor {
  name: string;
  description: string;
  inputSchema: { type: "object"; required?: string[] };
}

export function validateMcpCatalog(catalog: readonly McpToolDescriptor[], permittedTools: readonly string[]): void {
  for (const tool of catalog) {
    if (!permittedTools.includes(tool.name)) throw new Error(`MCP catalog exposes forbidden tool: ${tool.name}`);
    if (tool.inputSchema.type !== "object") throw new Error(`MCP tool must use an object schema: ${tool.name}`);
  }
}

export function mcpCatalog(tools: readonly ToolDefinition[], permittedTools: readonly string[]): McpToolDescriptor[] {
  return tools
    .filter((tool) => permittedTools.includes(tool.name))
    .map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema ?? { type: "object" } }));
}
