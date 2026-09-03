export interface ToolCall {
  name: string;
  input: Readonly<Record<string, unknown>>;
}

export interface ToolResult {
  name: string;
  output: unknown;
  provenance: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  execute(input: Readonly<Record<string, unknown>>): Promise<ToolResult>;
  inputSchema?: { type: "object"; required?: string[] };
}

export class ToolPermissionError extends Error {}
export class ToolInputValidationError extends Error {}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  async call(call: ToolCall, permittedTools: readonly string[]): Promise<ToolResult> {
    if (!permittedTools.includes(call.name)) throw new ToolPermissionError(`Tool not permitted: ${call.name}`);
    const tool = this.tools.get(call.name);
    if (!tool) throw new Error(`Tool not found: ${call.name}`);
    for (const key of tool.inputSchema?.required ?? []) if (!(key in call.input)) throw new ToolInputValidationError(`Missing required tool input: ${key}`);
    return tool.execute(call.input);
  }

  definitions(): ToolDefinition[] { return [...this.tools.values()]; }
}
