# Business Agent architecture

Business Agent keeps domain behavior in readable Markdown and keeps execution
mechanics in TypeScript. New business domains normally add configuration, not
runtime classes. Stateful application boundaries use small cohesive services.

Think of a review as a small team with a playbook. The **flow** is the
playbook, each **agent** owns one job, **skills** are reusable techniques, and
the **orchestrator** keeps the work ordered and recorded.

## Concepts

| Concept | Responsibility | File convention |
| --- | --- | --- |
| Domain | Vocabulary, policies, schemas, source-of-truth rules | `domain.md` |
| Agent | One specialized responsibility | `<id>.agent.md` |
| Skill | Reusable procedure or domain knowledge | `<id>/SKILL.md` |
| Prompt | Focused reusable model-facing text | `<id>.prompt.md` |
| Instructions | Shared operating constraints | `<id>.instructions.md` |
| Flow | Steps, dependencies, branches, and synthesis | `<id>.flow.md` |
| RunService | Owns run execution, handoffs, persistence, and review transitions | `src/core/orchestrator.ts` |
| FoundryClient | Owns Microsoft Responses API request/response concerns | `src/microsoft/foundry.ts` |
| RetrievalProvider | Supplies grounded documents with provenance | `src/core/ports.ts` |
| TelemetrySink | Receives run/agent events | `src/core/ports.ts` |
| ConsequentialActionGateway | Guards external writes and communications | `src/core/ports.ts` |
| Orchestrator | Compatibility functions delegating to `RunService` | TypeScript runtime |
| Runtime | Persistence, validation, status, and audit | TypeScript runtime |

## Domain layout

```text
domains/<domain-id>/
  domain.md
  agents/<agent-id>.agent.md
  skills/<skill-id>/SKILL.md
  prompts/<prompt-id>.prompt.md
  instructions/<instruction-id>.instructions.md
  flows/<flow-id>.flow.md
```

Only the artifact types a domain needs must be present. The generated
`domains/land-administration/` pack is the reference example.

## Execution model

The current mock executor runs the agents listed by a flow in declaration
order and writes:

```text
<workspace>/runs/<run-id>/
  input.md
  run.json
  agents/<agent-id>.md
```

The run record preserves the selected domain and flow, versions, status,
output paths, and errors. Agents do not directly edit the final user-facing
review during orchestrated execution.

For example, the land-administration flow uses intake first, then two
specialist reviews, then synthesis. The specialists report findings; the
synthesizer preserves conflicts and proposes a route for human confirmation.
That same shape can support permitting, case management, or other
domains without changing the runtime concepts.

## Provider boundary

The `AgentExecutor` interface is the provider boundary. The current
implementation is deterministic and offline. A Foundry executor seam exists
in `src/microsoft/foundry.ts`; it is not wired as a default and requires
endpoint credentials. The MCP layer currently provides a permissioned catalog
seam, not a network transport/server. Neither cloud integration is claimed as
live or production-tested here.

## Design conventions

Use pure functions for parsing, validation, calculations, grading, and other
transformations. Use a class or application service when behavior owns state,
injected dependencies, persistence, an external client, or a lifecycle
transition. Keep one cohesive responsibility per module; avoid generic
`utils` dumping grounds, static global state, deep inheritance, and hidden
dependencies. `AGENTS.md` contains the contributor version of these rules.
