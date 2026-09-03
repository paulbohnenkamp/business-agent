# Implementation status

The repository now has a provider-neutral foundation and an opt-in Microsoft
path.

Implemented locally:

- Markdown agent and skill loading;
- deterministic flow execution and persisted run records;
- `RunService` lifecycle boundary for execution, handoffs, and approval;
- permissioned typed tool registry;
- MCP tool catalog derived from permitted tools;
- Microsoft Foundry Responses API executor boundary;
- `FoundryClient` provider boundary with fake HTTP tests;
- JSONL evaluation cases and local executor evaluation;
- land-administration reference domain;
- local catalog and human-review web surface;
- pstack prompts and an append-only build decision trail.

Still requiring Azure credentials or service setup:

- live Foundry execution;
- Azure AI Search retrieval;
- Blob Storage ingestion;
- Entra ID authentication;
- Teams or Copilot Studio delivery;
- production telemetry export.
- container and CI assets are included, but cloud provisioning remains outside
  this repository.

The local fake remains the default so the project can be tested without cloud
access.

Run `npm run eval -- case-synthesizer` to execute both normal and adversarial
JSONL suites. Supply a second path to save the JSON summary. The deterministic
mock is intentionally not a quality claim about a language model; use the same
case files with the Foundry executor for model regression runs.
# Implementation checklist

## Offline proof layers

The repository deliberately separates three test inputs:

1. `examples/land-records/` contains fictional business records.
2. `MockExecutor` is a deterministic fake model/agent executor.
3. `tests/foundry.test.ts` uses a fake HTTP provider to test the Microsoft
   Foundry adapter without credentials.

The evaluation cases in `evaluations/` are behavioral contracts. The local
grader checks required content, preserved conflicts/unknowns, evidence or
provenance, expected routing, and forbidden side-effect claims. The
adversarial set is kept separate so it can be run as a regression suite.

## Runtime control points

- Every flow records agent handoffs and carries prior outputs into the next
  agent context.
- Every completed flow starts in `pending-human-review`.
- `updateReviewStatus` is the only current transition helper; it supports
  explicit `approved` and `rejected` decisions.
- Local retrieval returns source paths and locators. Azure AI Search remains a
  provider adapter, not an implicit dependency.
- Tool calls require both an agent permission and any declared required input.
- The MCP layer is a permissioned catalog seam; it is not yet a network MCP
  server.
- `BlockedActionGateway` and `NoopTelemetry` are safe local defaults for future
  external action and observability adapters.
- The functional/class boundary is intentional: transformations stay as
  functions; `RunService` and `FoundryClient` own lifecycle and dependencies.

## Verification matrix

| Layer | Offline proof |
| --- | --- |
| Definitions | Markdown loaders and catalog alignment tests |
| Seed data | Cross-record IDs and division-order calculation test |
| Flows | Lease, division-order, and parcel-transfer execution tests |
| Handoffs | Recorded paths and prior-context flow test |
| Evals | Structured grader, summaries, and adversarial fixtures |
| Retrieval | Ranked local results with provenance |
| Tools/MCP | Permission, required-input, and catalog contract tests |
| Foundry | Fake HTTP success and provider-error tests |
| Documentation | README, map, architecture, data model, runtime, eval, and safety docs |
| Build | TypeScript check, tests, and Next production build |
