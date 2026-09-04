import type { StepExecution } from "./typed-flow";

/** Opaque execution port. Domains own the request context and result shape. */
export interface AgentExecutionRequest<TInput, TContext = unknown> {
  readonly agentId: string;
  readonly input: TInput;
  readonly context: TContext;
}

export interface AgentExecutionPort<TContext = unknown> {
  execute<TInput, TOutput>(request: AgentExecutionRequest<TInput, TContext>): Promise<StepExecution<TOutput>>;
}
