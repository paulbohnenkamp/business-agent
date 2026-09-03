# Business Agent

Business Agent is a reusable, jurisdiction-neutral TypeScript runtime for
enterprise AI workflows. Business behavior lives in reviewable Markdown/YAML
artifacts; TypeScript provides loading, orchestration, tools, evaluation,
provenance, audit records, and provider boundaries. West Virginia oil-and-gas
land is the current flagship application and domain demonstration built on that
runtime.

## Start here

New to Business Agent? Follow [the five-minute quickstart](docs/quickstart.md).
It installs the project, runs the included example, and shows where the
results are saved. You do not need a model provider or cloud account for this
first run.

The shortest path is:

```sh
npm install
npm run cli -- domain list
npm run cli -- flow list --domain land-administration
```

The repository currently contains the generic `land-administration` domain and
its demonstration flows. Phase 1 of the `wv-land-well-reconciliation`
architecture is implemented: the WV-specific evidence and domain contracts are
available under `src/domains/wv-land`. The source adapters and flagship workflow
remain planned for later phases.

Then run the complete example in the [quickstart](docs/quickstart.md).

Then read [the documentation map](docs/README.md). The recommended order is:

1. [How the architecture fits together](docs/architecture.md)
2. [The data model](docs/data-model.md)
3. [How flows execute](docs/flow-runtime.md)
4. [How evaluations work](docs/evaluations.md)
5. [Safety and control model](docs/safety.md)
6. [How to author a new domain](docs/domain-authoring.md)

For the West Virginia flagship, read the [architecture specification](docs/WV_LAND_ARCHITECTURE.md)
and [implementation plan](docs/WV_LAND_IMPLEMENTATION_PLAN.md) before changing
the land domain or evidence model.

## Architecture

```text
Domain → Flow → Agents → Skills → Runtime artifacts
             ↘ any agent may request human review
```

- **Domain** — vocabulary, policies, schemas, and workflows.
- **Agent** — one specialized responsibility in `.agent.md`.
- **Skill** — reusable procedural guidance in `SKILL.md`.
- **Flow** — sequencing and routing in `.flow.md`.
- **Orchestrator** — selects and runs a flow.
- **Runtime** — loads definitions, executes agents, validates references, and
  persists run artifacts.
- **Human review** — a control gate for uncertainty, conflicts, and
  consequential actions. Any agent can request it; completed runs currently
  remain pending until a human approves or rejects them.

The short version: configuration describes the work; the TypeScript runtime
runs, checks, evaluates, and records it. The default executor is deterministic
and offline, while Microsoft Foundry is available behind an explicit adapter.

## Current status

Implemented and tested locally:

- Markdown agent and flow loading;
- deterministic mock execution;
- persisted run records and agent outputs;
- prior-agent handoffs and explicit human-review transitions;
- cohesive `RunService` and `FoundryClient` boundaries;
- domain-aware listing, run, and inspect commands;
- the current generic `land-administration` demonstration domain; the WV
  flagship workflow migration remains planned;
- West Virginia Phase 1 evidence, finding, conflict, unknown, well, and
  production contracts with validated JSON serialization;
- structured and adversarial evaluation cases;
- local retrieval with provenance;
- permissioned tools and MCP catalog seam;
- Microsoft Foundry adapter with fake-provider tests;
- safe local telemetry and consequential-action ports.

Requires credentials or additional service integration:

- live Foundry model execution;
- Azure AI Search and Blob Storage;
- Entra ID authentication and production telemetry;
- network MCP server/transport;
- true parallel dependency-graph scheduling;
- production-grade structured output schemas.

## Development

```sh
node --version
npm install
npm run typecheck
npm test
npm run build
npm run eval -- case-synthesizer
```

The installed Node runtime is the compatibility baseline. Check it with
`node --version` before changing dependency versions.
