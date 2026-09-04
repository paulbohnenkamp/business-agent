export type StepExecution<T> =
  | { readonly status: "succeeded"; readonly artifact: T }
  | { readonly status: "failed"; readonly kind: "execution" | "validation"; readonly error: string };

/** Opaque execution port. Domains own the request context and result shape. */
export interface AgentExecutionRequest<TInput, TContext = unknown> {
  readonly agentId: string;
  readonly input: TInput;
  readonly context: TContext;
}

export interface AgentExecutionPort<TContext = unknown> {
  execute<TInput>(request: AgentExecutionRequest<TInput, TContext>): Promise<StepExecution<unknown>>;
}
