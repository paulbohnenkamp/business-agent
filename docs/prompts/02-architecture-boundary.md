# Prompt: establish the architecture boundary

```text
Use /poteto-mode to design the next bounded change for Business Agent.

Intent: preserve the existing domain-oriented model while making the runtime
ready for real AI execution. Domain behavior belongs in readable Markdown and
YAML front matter. TypeScript owns loading, validation, orchestration,
persistence, provider adapters, and safety enforcement.

Inspect the current agent, skill, flow, definition, and executor contracts.
Propose the smallest architecture that separates:

- declarative domain behavior;
- model execution;
- executable tools;
- MCP transport;
- retrieval;
- human approval;
- evaluations and telemetry.

Do not add a framework merely because it is popular. Do not create a generic
multi-agent platform. Do not implement Azure integration yet. Produce a spec
with interfaces, data-flow, non-goals, migration steps, and tests that prove
the provider boundary. Implement only after the spec is reviewed, and keep the
change small enough for one focused pull request.
```
