import type { AgentExecutionPort, StepExecution } from "./agent-execution";
export type { StepExecution } from "./agent-execution";

/** A provider-neutral result returned by one ordered execution step. */
/** A validated, transient record of one step and its produced artifact. */
export type StepRecord =
  | { readonly status: "succeeded"; readonly stepId: string; readonly artifact: unknown }
  | { readonly status: "failed" | "blocked"; readonly stepId: string; readonly kind: "execution" | "validation"; readonly error: string };

export interface TypedStep {
  readonly id: string;
  readonly required: boolean;
  readonly execute: (input: unknown, execution?: AgentExecutionPort) => Promise<StepExecution<unknown>>;
}

export interface TypedStepSpec<I, O> {
  readonly id: string;
  readonly required: boolean;
  readonly validateInput: (value: unknown) => value is I;
  readonly validateOutput: (value: unknown) => value is O;
  readonly execute: (input: I, execution?: AgentExecutionPort) => Promise<StepExecution<O>>;
}

export interface OrderedFlowExecution {
  readonly status: "succeeded" | "failed";
  readonly steps: readonly StepRecord[];
  readonly artifacts: readonly unknown[];
  readonly failure?: { readonly stepId: string; readonly kind: "execution" | "validation"; readonly message: string };
}

/**
 * Erases step-local types only at the generic orchestration boundary. Each
 * step validates its input and output before this function passes artifacts
 * onward. No topology or domain meaning is encoded here.
 */
export function typedStep<I, O>(spec: TypedStepSpec<I, O>): TypedStep {
  return {
    id: spec.id,
    required: spec.required,
    async execute(input: unknown, execution?: AgentExecutionPort): Promise<StepExecution<unknown>> {
      let typedInput: I;
      try { if (!spec.validateInput(input)) return { status: "failed", kind: "validation", error: `Invalid input for step ${spec.id}` }; typedInput = input; } catch (error) { return { status: "failed", kind: "validation", error: `Input validation for ${spec.id} threw: ${diagnostic(error)}` }; }
      let result: StepExecution<O>;
      try { result = await spec.execute(typedInput, execution); } catch (error) { return { status: "failed", kind: "execution", error: `Step ${spec.id} execution threw: ${diagnostic(error)}` }; }
      if (result.status === "failed") return result;
      let validOutput: boolean;
      try { validOutput = spec.validateOutput(result.artifact); } catch (error) { return { status: "failed", kind: "validation", error: `Output validation for ${spec.id} threw: ${diagnostic(error)}` }; }
      if (!validOutput) return { status: "failed", kind: "validation", error: `Invalid output for step ${spec.id}` };
      try { return { status: "succeeded", artifact: immutableClone(result.artifact) }; } catch (error) { return { status: "failed", kind: "validation", error: `Output for ${spec.id} could not cross the immutable boundary: ${diagnostic(error)}` }; }
    },
  };
}

/** Execute an explicitly ordered collection of required or optional steps. */
export async function executeOrderedSteps(input: unknown, steps: readonly TypedStep[], execution?: AgentExecutionPort): Promise<OrderedFlowExecution> {
  const records: StepRecord[] = [];
  const artifacts: unknown[] = [];
  let current = input;
  for (const step of steps) {
    const result = await step.execute(current, execution);
    if (result.status === "failed") {
      records.push({ status: "failed", stepId: step.id, kind: result.kind, error: result.error });
      for (const blocked of steps.slice(records.length)) records.push({ status: "blocked", stepId: blocked.id, kind: "execution", error: `Blocked by failed step ${step.id}` });
      if (step.required) return { status: "failed", steps: records, artifacts, failure: { stepId: step.id, kind: result.kind, message: result.error } };
      continue;
    }
    records.push({ status: "succeeded", stepId: step.id, artifact: result.artifact });
    artifacts.push(result.artifact);
    current = result.artifact;
  }
  return { status: "succeeded", steps: records, artifacts };
}

function diagnostic(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function immutableClone<T>(value: T): T { const clone = structuredClone(value); freeze(clone); return clone; }
function freeze(value: unknown): void { if (typeof value !== "object" || value === null || Object.isFrozen(value)) return; for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
