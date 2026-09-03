---
id: 008-wv-land-phase-5-flow
title: West Virginia land Phase 5 flagship flow
status: completed
created: 2026-09-03
updated: 2026-09-03
result: results/008-wv-land-phase-5-flow.md
---

## Goal

Simplify the land-administration catalog and implement the offline,
provider-neutral `wv-land-well-reconciliation` flow with exactly the three
documented agents: `land-case-intake`, `land-well-reconciler`, and
`case-synthesizer`. The flow must pass typed structured artifacts through
ordered required steps and preserve the distinction between execution failure
and successful business uncertainty.

## Non-goals

This slice does not persist findings, implement human-review lifecycle state,
add behavioral evaluation infrastructure, call live WV endpoints, require
Foundry credentials, implement H6A, infer title or ownership, execute
consequential actions, or build a general workflow engine.

## Current-state findings

- Phase 1–4 provide validated WV contracts, frozen evidence, source adapters,
  and deterministic comparison tools.
- The generic runtime currently passes Markdown context and has no typed flow
  execution seam for domain artifacts.
- The land catalog still exposes the pre-flagship agents and flows.
- Existing `Finding`, `Conflict`, and `Unknown` codecs validate the structured
  business contracts but do not define transient flow envelopes.

## Chosen approach

Add a small provider-neutral runtime seam in `src/core` for ordered typed
steps, required/failed execution, transient artifacts, and validated step
results, while keeping WV input/output contracts under
`src/domains/wv-land`. The runtime must not encode the three-agent topology
and must not become a general workflow engine. Production agent judgment is
owned by the configured provider-neutral agent executor; Phase 5 does not
implement a fake deterministic agent. Markdown definitions describe agent
responsibilities and remain presentation/configuration, never canonical
findings. Validate every boundary and stop synthesis from reporting success
when a required step or required evidence source failed.

Offline deterministic tests inject an explicitly test-only executor that
returns predefined structured results. Those tests verify orchestration given
valid agent results; they do not verify that an agent makes correct judgments
from arbitrary evidence. Agent behavior and compliance belong to Phase 7.

## Alternatives considered

- Extending `RunService` into a generic workflow engine was rejected because
  Phase 5 needs only one typed sequential seam and Phase 6 owns persistence.
- Making Markdown output canonical was rejected because structured findings,
  provenance, conflicts, and unknowns must remain machine-verifiable.
- Merging WVDEP and WVGES records was rejected because independent publishers
  and historical multiplicity are required evidence.
- Treating source failure as `Unknown`, or production no-match as zero, was
  rejected because those states have different business meanings.

## Affected files or modules

- `src/core/typed-flow.ts`
- `src/core/catalog.ts`
- `src/domains/wv-land/flow.ts`
- `src/domains/wv-land/index.ts`
- `domains/land-administration/catalog.yaml`
- three canonical agent Markdown definitions
- `domains/land-administration/flows/wv-land-well-reconciliation.flow.md`
- retired legacy catalog definitions as required by the migration matrix
- `tests/wv-land-flow.test.ts`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`
- this spec and `results/008-wv-land-phase-5-flow.md`

## Milestones

1. Add topology-neutral typed-step contracts and validation.
2. Add canonical WV agent/flow definitions and typed domain artifacts.
3. Migrate active catalog discovery without destructive historical cleanup.
4. Add test-only executor coverage for valid artifacts, uncertainty, and
   required-step failures.
5. Run the complete Phase 1–5 verification suite and inspect the full diff.

## Acceptance criteria

- The active catalog contains exactly the three flagship agents and the
  `wv-land-well-reconciliation` flow, while only the four reusable documented
  skills remain active.
- Typed input/output and ordered required step contracts are validated.
- Required evidence acquisition success/failure is represented explicitly.
- Fixture-backed normalized evidence and Phase 4 deterministic results enter
  execution before judgment.
- Intake preserves missing/ambiguous clues without inventing identifiers.
- Reconciliation emits validated transient evidence-linked findings, conflicts,
  and unknowns while preserving WVDEP/WVGES independence.
- Synthesis preserves upstream artifacts and cannot complete after required
  execution/evidence failure.
- Successful business uncertainty remains distinct from execution failure.
- Production no-match and reported zero remain distinct; no title or ownership
  conclusion or consequential action is performed.
- Offline tests cover topology, typed I/O, propagation, failure paths,
  provenance, source independence, and generalized synthetic cases.
- Tests use a clearly test-only stub executor with predefined structured
  results. They prove that valid structured agent results are validated and
  propagated correctly; they do not prove LLM judgment quality, prohibited-
  claim compliance, or arbitrary-evidence correctness.
- No production offline reconciler or deterministic TypeScript implementation
  masquerades as any canonical agent.
- The generic runtime does not encode exactly three steps or any WV topology.
- Required evidence acquisition status is explicit: successful no-match is
  business evidence state, while required acquisition failure blocks the flow.
- Validated transient artifacts cross an immutable boundary and nested
  case-bearing findings must match the enclosing case.
- `RunService` is not broadened to persist or orchestrate structured WV
  findings; that integration remains Phase 6.
- Obsolete definitions are removed from active catalog discovery without
  physically deleting potentially reusable historical Markdown unless the
  migration explicitly requires deletion.
- `npm run typecheck`, targeted Phase 1–5 tests, `npm test`, `npm run build`,
  `git diff --check`, record validation, leakage checks, and frozen fixture hash
  verification are run and recorded.

## Verification commands

```sh
node --version
npm run typecheck
node --import tsx --test tests/wv-land-flow.test.ts tests/wv-land-contracts.test.ts tests/wv-land-fixtures.test.ts tests/source-retrieval.test.ts tests/wv-land-adapters.test.ts tests/wv-land-tools.test.ts
npm test
npm run build
git diff --check
npm run validate:records
rg -n -i 'wvdep|wvges|west virginia' src/core
```

## Risks and open questions

- The existing generic `RunService` remains a legacy Markdown runner; Phase 5
  must not accidentally claim it provides typed flagship execution.
- Catalog tests that assert the old demonstration topology require migration to
  the documented Phase 5 active catalog.

## Progress log

- 2026-09-03: Derived the Phase 5 objective, contracts, migration, deferrals,
  and verification from the committed architecture and implementation plan.
- 2026-09-03: Approved by the explicit Phase 5 implementation request; work in
- 2026-09-03: Implemented the generic typed-step seam, canonical WV flow,
  active catalog migration, and test-only executor coverage.
- 2026-09-03: Completed full Phase 5 verification; the matching result record
  is `results/008-wv-land-phase-5-flow.md`.

## Decision log

- 2026-09-03: Kept typed orchestration provider-neutral and separate from the
  persistence-oriented `RunService` to minimize runtime change.
- 2026-09-03: Kept domain-specific evidence and judgment contracts under
  `src/domains/wv-land`; `src/core` receives only generic step mechanics.
- 2026-09-03: Rejected a deterministic offline reconciler as a fake agent.
  Offline Phase 5 tests use only a clearly test-scoped stub executor with
  predefined structured outputs.
- 2026-09-03: Kept the core seam topology-neutral: the WV domain configures
  exactly three ordered steps; core understands ordered required steps and
  validated transient artifacts only.
- 2026-09-03: Kept structured WV execution outside `RunService`; persistence
  and run-history integration belong to Phase 6.
- 2026-09-03: Defined catalog migration as active-discovery migration. Useful
  historical Markdown is not destructively deleted solely to simplify the
  active catalog.
- 2026-09-03: Strengthened flow input validation with the existing source/fact
  codecs and enforced case identity across structured handoffs.

## Final implementation boundary

Phase 5 establishes canonical agent definitions, typed agent input/output
contracts, structured-output validation, a provider-neutral agent execution
boundary, WV-owned three-step sequencing, artifact propagation, and
required-step failure propagation. It does not implement agent intelligence.

The executor contract concept is an ordered collection of typed step
definitions. Each step declares input and output validators, required/failed
execution semantics, and an execution function supplied through the
provider-neutral agent boundary. The result records step status, transient
artifact or failure, and preserved upstream artifacts. The WV flow supplies
exactly three steps; `src/core` does not know their IDs or count.

`RunService` remains unchanged for its existing Markdown-oriented behavior.
Phase 5 does not persist structured findings or add structured run history.

Phase 7 will exercise the actual agent definitions through an appropriate
provider/executor against frozen evidence and evaluate finding quality,
grounding, conflicts, unknowns, routing, prohibited claims, prompt injection,
unauthorized actions, cross-case leakage, and related behavioral quality.

Phase 9 owns live Microsoft/Foundry integration and credentials. Phase 5 has
no direct Foundry dependency.
