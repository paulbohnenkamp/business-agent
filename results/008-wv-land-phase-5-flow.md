---
id: 008-wv-land-phase-5-flow
title: West Virginia land Phase 5 flagship flow
status: completed
completed: 2026-09-03
spec: specs/008-wv-land-phase-5-flow.md
---

## What changed

Implemented the Phase 5 flagship surface without implementing agent judgment.
The repository now has canonical Markdown definitions for `land-case-intake`,
`land-well-reconciler`, and `case-synthesizer`, plus the
`wv-land-well-reconciliation` flow definition. A minimal generic ordered-step
seam validates typed inputs and outputs, records transient artifacts and
failures, and blocks dependent required steps after failure.

The WV domain defines the exact three-step topology and typed transient input,
intake, reconciliation, synthesis, and flow-result contracts. Production
judgment remains behind an injected provider-neutral `WvAgentExecutor`.
Predefined outputs exist only in `tests/wv-land-flow.test.ts` as test
infrastructure.

## Files changed

- `src/core/typed-flow.ts`
- `src/core/catalog.ts`
- `src/domains/wv-land/flow.ts`
- `src/domains/wv-land/index.ts`
- `domains/land-administration/catalog.yaml`
- `domains/land-administration/agents/land-case-intake.agent.md`
- `domains/land-administration/agents/land-well-reconciler.agent.md`
- `domains/land-administration/agents/case-synthesizer.agent.md`
- `domains/land-administration/flows/wv-land-well-reconciliation.flow.md`
- `tests/catalog.test.ts`
- `tests/architecture.test.ts`
- `tests/wv-land-flow.test.ts`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`
- `specs/008-wv-land-phase-5-flow.md`

Legacy Markdown definitions remain on disk but are no longer exposed by the
active catalog. No raw fixture files were changed.

## Checks run and results

- `node --version` — v24.14.1
- `npm run typecheck` — passed
- targeted Phase 5, catalog, architecture, and Phase 2–4 tests — passed
- `npm test` — passed, 81 tests
- `npm run build` — passed; existing Next.js package-lock tracing warning only
- `git diff --check` — passed
- `rg -n -i 'wvdep|wvges|west virginia|well|land' src/core` — no matches
- `node --import tsx --test tests/wv-land-fixtures.test.ts` — passed; frozen
  raw hashes and byte lengths remain valid
- `npm run validate:records` — Phase 5 records validate; pre-existing missing
  required headings remain in records 001–004.

## Deviations from the spec

- The generic seam is implemented as topology-neutral erased step execution
  with step-local validators; the WV domain supplies exactly three typed steps.
- Required evidence acquisition status is consumed before agent execution;
  successful no-match remains distinct from required acquisition failure.
- Legacy definitions were retained physically and removed from active catalog
  discovery, matching the approved migration constraint.
- Phase 5 does not provide a production offline executor or deterministic WV
  judgment implementation. Test-only predefined outputs prove orchestration
  contracts only.

## Important decisions

- `RunService` was not changed. Structured WV persistence and run-history
  integration remain Phase 6 work.
- `Finding`, `Conflict`, and `Unknown` remain the Phase 1 contracts; the flow
  adds no parallel business-state model.
- Execution failure, validation failure, blocked dependent steps, and
  successful business uncertainty remain distinct observable states.
- WVDEP and WVGES evidence is passed through independently, with provenance
  references and historical multiplicity preserved.
- The Phase 5 deterministic tests do not claim to evaluate LLM judgment,
  prohibited-claim compliance, prompt injection, or arbitrary-evidence
  correctness; those are Phase 7 concerns.
- Required evidence acquisition is represented separately from successful
  acquisition with no matching evidence.
- Validated transient artifacts are cloned and frozen before downstream
  handoff, and nested finding case IDs are checked against the flow case.

## Remaining follow-ups

- Phase 6: persist structured results, integrate run history, and implement
  human-review lifecycle state.
- Phase 7: evaluate actual agent behavior against frozen evidence and
  adversarial cases.
- Phase 9: add optional live Microsoft/Foundry execution and credentials.
- H6A, live WV endpoints, UI, and consequential actions remain deferred.

## Acceptance status

All Phase 5 implementation and verification criteria are satisfied. The
working tree is intentionally left uncommitted for review.

## Self-review findings

The complete Phase 5 diff was reviewed read-only. No fake production agent
judgment, fixed three-step core topology, WV leakage into `src/core`,
RunService expansion, persistence, Phase 7 evaluation infrastructure, Phase 9
provider dependency, live endpoint use, source merging, production-zero
fabrication, title assertion, or consequential action was found.

## Must fix before commit

- None.

## Should improve before commit

- The existing legacy record-validator findings in records 001–004 should be
  repaired only in a separate cleanup task.

## Commit recommendation

YES after human review. No commit was created.
