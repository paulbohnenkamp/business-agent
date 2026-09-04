---
id: 010-wv-land-phase-7-evaluations
title: West Virginia land Phase 7 fixture-backed evaluations
status: completed
completed: 2026-09-04
spec: specs/010-wv-land-phase-7-evaluations.md
---

## What changed

Implemented a provider-neutral WV evaluation path around the existing typed
Phase 5 flow and `WvAgentExecutor` seam. The evaluator now loads and validates
discriminated WV cases, preserves fixture and business-case identity, runs
frozen parser/normalization checks through the existing source adapters, grades
structured findings/conflicts/unknowns/evidence/provenance/routes/statuses,
and applies hard-gate safety and grounding checks.

The suite includes deterministic fixture cases, harness-validation cases with
predefined structured artifacts, individual-agent behavioral cases, and
flagship-flow behavioral cases. The CLI dispatches the flagship flow ID to the
typed suite while preserving legacy single-agent evaluation behavior.

The remediation strengthened intake and synthesis expectations, added direct
typed-flow uncertainty and failure coverage, expanded cross-case grounding,
implemented typed production unit and normalization-rule checks, narrowed
safety predicates, and required an explicit behavioral executor capability.

## Files changed

- `src/evaluations/wv-land.ts`
- `evaluations/wv-land.jsonl`
- `scripts/run-evals.ts`
- `tests/wv-land-evaluations.test.ts`
- `docs/evaluations.md`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`
- `specs/010-wv-land-phase-7-evaluations.md`
- `results/010-wv-land-phase-7-evaluations.md`

The Phase 2 fixture bytes and normalized evidence were not changed. No Phase
1–6 business contract, canonical agent definition, typed flow, action port, or
package dependency was changed.

## Evaluation architecture

The four execution kinds are:

- `deterministic-fixture`
- `harness-validation`
- `agent-behavior`
- `flagship-flow-behavior`

Predefined structured artifacts are accepted only by harness-validation cases.
Behavioral results use explicit measurement states: `not-applicable`,
`not-collected`, `collected`, and `failed`. A missing genuine executor produces
`not-collected` with no behavioral pass/fail claim. A genuine executor that
returns a bad but gradeable structured answer produces `collected` plus a
failing grade. A genuine execution failure produces measurement `failed`.
Behavioral collection requires non-empty executor identity and version plus the
`genuine-agent-execution` capability. Predefined, replay, and stub descriptors
are rejected. This is a software classification contract, not cryptographic
attestation.

Structured checks use `pass`, `fail`, and `info` outcomes with hard-gate
semantics. Hard failures cannot be offset by the optional diagnostic score.
Evidence references, source/snapshot relationships, case identity, source
independence, production semantics, and prohibited actions are evaluated
deterministically. Free-text checks remain narrow, claim-oriented safety
tripwires rather than semantic quality grading. The action predicate recognizes
explicit affirmative claims from the supported action vocabulary and excludes
the documented negation, boundary, question, and future-action contexts.

## Evaluation case counts

- `deterministic-fixture`: 3
- `harness-validation`: 4
- `agent-behavior`: 4
- `flagship-flow-behavior`: 3
- Total: 14

## Checks run and results

- `node --version`: v24.14.1
- targeted `node --import tsx --test tests/wv-land-evaluations.test.ts`: passed,
  15 tests
- `npm test`: passed, 109 tests
- `npm run typecheck`: passed
- `npm run build`: passed; existing Next.js package-lock tracing warning only
- `npm run eval -- wv-land-well-reconciliation`: passed, with 14
  cases, 7 deterministic/harness passes, and 0 deterministic/harness failures
- `npm run eval -- wv-land-well-reconciliation list`: passed and
  discovered all 14 cases
- legacy `case-synthesizer` evaluation invocation: original path preserved;
  existing prose/MockExecutor suite reported 1 pass and 9 failures, with no
  Phase 7 WV cases involved
- frozen Phase 2 fixture/hash verification: passed
- `git diff --check`: passed
- `npm run validate:records`: Phase 7 spec/result records validate; unrelated
  pre-existing findings remain in records 001–004
- core WV leakage scan: no WV or land vocabulary introduced into `src/core`
- no test or evaluation required a live WV government endpoint

## Behavioral measurements

Genuine behavioral measurements collected: NO.

The local credential-free environment supplied no genuine external
`WvAgentExecutor`. The 7 behavioral cases were defined and reported as
`not-collected`; predefined harness artifacts were not counted as agent-quality
measurements. No Foundry or Azure integration was implemented.

## Implemented assertions and cases

The suite covers:

- immutable frozen snapshot hashes and lengths;
- raw publisher fields mapped to normalized properties;
- typed values, identifiers, units, and historical record discriminators;
- deliberate wrong-field, wrong-property, wrong-value, wrong-unit, and
  missing-record mutations;
- fixture ID `braxton-4700701733` versus business case ID
  `synthetic-wv-case-braxton-001`;
- independent WVDEP and WVGES evidence, historical multiplicity, WVGES record
  types, and operator disagreement;
- frozen production no-match versus synthetic reported zero;
- missing evidence and required acquisition failure contracts;
- evidence/provenance grounding and foreign references;
- intake clue/case preservation and synthesis conflict/unknown preservation;
- successful uncertainty versus acquisition, execution, and validation failure;
- finding, conflict, unknown, provenance, nested synthesis, and top-level
  cross-case isolation;
- synthetic production unit and declared normalization-rule semantics;
- title/ownership, filing/payment/registry/communication, and prompt-injection
  safety patterns;
- hard-gate behavior and repeated deterministic grading;
- individual canonical-agent and flagship-flow behavioral case contracts;
- cross-case evidence and business-case isolation checks.

## Deviations from the spec

- The implementation uses one cohesive `src/evaluations/wv-land.ts` module for
  case loading, fixture interpretation, grading, execution, and summaries
  rather than requiring multiple evaluator classes.
- The result uses `passed: null` for `not-collected` behavioral cases so that
  absence of measurement is neither behavioral success nor behavioral failure.
- An optional structured production expectation was added to make the frozen
  no-match and synthetic reported-zero distinction directly gradeable without
  modifying Phase 1–6 contracts.
- A synthetic in-memory production evidence record is used only for positive
  parser unit/rule grading because the frozen public workbook has no matching
  production row. It is separate from the frozen real evidence.

## Important decisions

- The existing `WvAgentExecutor` remains the only WV agent-execution boundary.
- Behavioral evaluation accepts only an executor binding with explicit
  identity, version, and `genuine-agent-execution` capability. This prevents
  accidental replay/stub classification but is not cryptographic attestation.
- Static retrieval providers and frozen bytes are used for deterministic
  evaluation; no live endpoint is reachable from the suite.
- Legacy evaluation files and the prose evaluator remain supported.
- Phase 6 remains responsible for approval-versus-action protection; Phase 7
  adds no action-capable dependency to the typed flow.
- No LLM-as-judge, fake LLM, Foundry integration, evaluation database, or
  generic benchmark platform was added.

## Remaining follow-ups

- Phase 8: case-centered UI, evidence display, review UI, and chat/copilot.
- Phase 9: Foundry/provider integration, credentials, and optional live-source
  refresh.
- Genuine behavioral measurements require a separately supplied external
  executor and approved evaluation environment.
- H6A, county/deed/title-chain integration, title certification, filing,
  payment, registry mutation, communication, and other consequential execution
  remain deferred.

## Acceptance status

All seven Phase 7 acceptance criteria are satisfied by the deterministic,
harness, and direct typed-flow coverage. The 7 behavioral cases remain defined
but not collected locally. No behavioral agent quality, prompt-injection
resistance, or provider-backed safety claim is made. The implementation is
ready for focused independent verification and remains uncommitted.
