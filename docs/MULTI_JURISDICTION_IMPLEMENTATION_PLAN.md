# Multi-jurisdiction implementation plan

**Phase 7.5 status: migration complete on 2026-09-04.**

This is a living, behavior-preserving checklist for the architecture in
[MULTI_JURISDICTION_ARCHITECTURE.md](MULTI_JURISDICTION_ARCHITECTURE.md). It
does not authorize Ohio or Pennsylvania implementation. The Phase 1–7 WV
behavior is the compatibility baseline.

## Global acceptance criteria

- [x] WV remains the flagship jurisdiction, not a runtime assumption.
- [x] Shared evidence/judgment/review is distinct from shared land
      administration and from WV implementation.
- [x] Jurisdiction policy is distinct from publisher parsing and retrieval.
- [x] `SourceAdapter` remains distinct from `RetrievalProvider`.
- [x] WVDEP and WVGES remain independent evidence sources.
- [x] Generic evaluation mechanics are independent from land grading and WV
      cases.
- [x] Generic durable-run and review mechanics are independent from land
      aggregate state.
- [x] Deterministic parsing, normalization, arithmetic, hashing, and dates
      remain services/tools, not agent responsibilities.
- [x] Agents remain bounded evidence-based judgment components; flows retain
      sequencing/routing.
- [x] Human review and the public-evidence-is-not-title-proof boundary remain
      explicit.
- [x] No 50-state framework, plugin system, generalized DAG engine, or
      speculative registry is introduced.
- [x] All Phase 1–7 tests and fixture behavior remain green after every step.

## Ordered extraction steps

### 0. Correct neutral runtime contracts and composition roots

**Status:** completed and committed as `046db76` on 2026-09-04
**Current dependency:** `src/core/ports.ts` imports `RetrievedDocument` from
`src/retrieval/local.ts`; `src/core/orchestrator.ts` imports concrete
`FileRunStore`; and `src/core/storage.ts` imports `RunRecord` from
`orchestrator.ts`.
**Move:** establish `RetrievedDocument` in `src/core/ports.ts`, `RunRecord`,
`RunStatus`, and `ReviewStatus` in `src/core/run-record.ts`, and `RunStore` in
`src/core/storage.ts`. Move the concrete `FileRunStore` implementation to
`src/storage/file-run-store.ts`; retrieval providers consume the neutral
document contract.
**Destination:** neutral core ports/contracts; concrete retrieval and file
storage remain under retrieval/storage infrastructure. Composition callers
construct `FileRunStore` and inject the `RunStore` into `RunService`/`runFlow`;
no DI framework is introduced.
**Compatibility:** preserve current `RetrievedDocument`, `RunRecord`,
`FileRunStore`, CLI behavior, and persisted JSON while migrating imports and
construction in one bounded step. `orchestrator.ts` re-exports the canonical
run types so existing type imports remain valid; this is a compatibility
re-export, not a duplicate contract, and is retained until an intentional
public API change removes it.
**Proof:** baseline tests, retrieval/provider tests, run persistence tests, and
`tests/architecture.test.ts` checks proving core does not import
`retrieval/local` or `FileRunStore`, and storage does not import orchestrator.
**Architecture check:** concrete retrieval implements neutral contracts;
generic orchestration depends on storage ports and does not instantiate a
filesystem store.
**Risk:** medium.
**Rollback:** restore the old imports and composition root without changing
persisted artifacts.

### 1. Establish architecture import checks and a contract inventory

**Status:** completed and committed in the current migration
**Move:** record the current import graph and identify forbidden edges before
moving types. Add architecture tests only for dependency direction; do not
change runtime behavior.
**Representative files:** `src/core/**`, `src/domains/wv-land/**`,
`src/evaluations/wv-land.ts`.
**Destination:** architecture-test support under `tests/` and a short checked
inventory in this plan.
**Compatibility:** observation-only; no names or paths change.
**Proof:** baseline typecheck/tests/build and a test proving `src/core` has no
WV imports.
**Risk:** low.
**Rollback:** remove only the new architecture test.

**Inventory:** neutral runtime contracts live in `src/core`; retrieval and
storage implementations live below `src/retrieval` and `src/storage`;
WV-specific contracts, flows, adapters, tools, and persistence remain under
`src/domains/wv-land`; the evaluator currently composes WV fixtures and flow
behavior from `src/evaluations/wv-land.ts`. The architecture tests enforce the
first dependency direction and reserve `src/evaluations/core` for the next
extraction step.

### 2. Extract generic evaluation mechanics

**Status:** completed and committed in the current migration
**Move:** execution-kind model, measurement states, executor descriptor and
binding authenticity, check result, hard-gate calculation, scores, summaries,
and generic JSONL loading from `src/evaluations/wv-land.ts`.
**Destination:** `src/evaluations/core/`.
**Compatibility:** keep a temporary WV suite composition module; migrate all
callers in the same change. Do not preserve duplicate public models beyond the
step.
**Proof:** existing `tests/wv-land-evaluations.test.ts`, evaluation CLI output,
and new core unit/contract tests with no WV strings.
**Architecture check:** evaluation core cannot import `wv-land`, WV fixtures,
or publisher IDs.
**Risk:** medium because the current evaluator is densely coupled.
**Rollback:** revert the extraction while retaining the unchanged WV suite.

**Implementation note:** the shared execution-kind, measurement, check,
hard-gate, score, diagnostic, and JSONL mechanics are in
`src/evaluations/core`; WV fixture parsing and land-specific grading remain in
the WV suite composition.

### 3. Extract shared evidence, judgment, and JSON boundary contracts

**Status:** completed and committed in the current migration
**Move:** `SourceIdentity`, `SourceSnapshot`, generic `SourceEvidence<T>`,
`Provenance`, and `Finding`, plus their validation/codec mechanics. Generalize
source mechanism metadata without adding land fields. `Conflict` and `Unknown`
are shared judgment contracts carried in an aggregate-scoped container whose
case/run scope is validated against the containing aggregate.
**Destination:** `src/evidence/`.
**Compatibility:** migrate codecs and imports immediately; use a short-lived
WV adapter only at the old public boundary, then delete WV aliases.
**Proof:** existing contract, serialization, and persistence tests; add a
non-land-shaped evidence/judgment fixture test and a cross-case test proving
unscoped conflicts/unknowns cannot be persisted or attached across aggregates.
**Architecture check:** shared evidence has no land or state imports; generic
judgment children cannot escape their containing aggregate.
**Risk:** medium/high because persistence and flow validators currently use
the WV contracts.
**Rollback:** restore the contract files while leaving evaluation extraction
independent.

**Implementation note:** `src/evidence/contracts.ts` now owns source identity,
immutable snapshot, source evidence, provenance, and finding contracts. WV
codecs retain the existing validation behavior while importing those neutral
types. WV remains responsible for domain-specific judgment production and
validation composition.

### 4. Establish the minimal shared LandWell projection

**Status:** completed and committed in the current migration
**Architectural purpose:** establish the smallest shared Land Administration
well concept demonstrated by the current reconciliation workflow, without
turning it into a union of WV, Ohio, and Pennsylvania schemas.
**Move/current files:** extract the workflow-facing portion of `Well` from
`src/domains/wv-land/contracts.ts` and migrate its affected evidence, flow,
codec, and persistence callers through a temporary WV adapter.
**Destination:** shared land `LandWell` responsibility with stable workflow
identity, source-backed identifier references, evidence/provenance linkage,
and only normalized name/number, operator, county, status/type, dates, or
coordinate role/CRS fields that shared reconciliation actually consumes.
**WV/publisher boundary:** retain WV `Well`, WVDEP/WVGES raw identifiers and
labels, lease/farm fields, publisher coordinate details, and jurisdiction
identifier/status/type interpretation as WV/publisher evidence or extensions.
PA municipality/MCD, operator numbers, pads, conventional/unconventional
classification, and publisher historical fields remain outside the shared
contract unless a shared workflow requirement later justifies an equivalent.
**Compatibility/migration:** preserve every raw publisher value and existing
WV evidence alias while mapping valid facts into `LandWell`; do not alter
fixture bytes or persisted behavior.
**Proof:** WV contract, adapter, flow, codec, and persistence tests remain
green; add shared contract tests for identity, evidence linkage, coordinate
role/CRS, extensions, and PA-specific-field isolation.
**Architecture check:** shared land imports no WV or publisher module; publisher
adapters depend downward on neutral retrieval/evidence ports and jurisdiction
composition interprets their output.
**Risk:** medium.
**Rollback:** restore the unchanged WV `Well` contract and adapter boundary
without changing fixture bytes or persisted artifacts.
**Completion:** all current workflow consumers use `LandWell` or a documented
temporary adapter, raw evidence remains available, and no publisher-only
field is required by the shared contract.

**Implementation note:** `src/domains/land-administration/contracts.ts` owns
the minimal projection; `src/domains/wv-land/projections.ts` is the temporary
WV mapping and preserves publisher-only values in extensions.

### 5. Establish the minimal shared LandProductionRecord projection

**Status:** completed and committed in the current migration
**Architectural purpose:** establish the smallest shared source-backed
production observation demonstrated by land administration, without claiming
complete Ohio production semantics.
**Move/current files:** extract the workflow-facing portion of
`ProductionRecord` from `src/domains/wv-land/contracts.ts` and migrate
affected WV evidence, workbook adapter, aggregation, codec, flow, and
persistence callers through a temporary WV adapter.
**Destination:** shared land `LandProductionRecord` responsibility containing
well/reference identity, explicit reporting-period semantics, reported value,
explicit unit, source identity, provenance/evidence linkage, and distinct
no-match versus reported-zero state.
**WV/publisher boundary:** keep the WVDEP workbook schema/parser, WV commodity
columns, raw production identifiers, WV normalization, and publisher-specific
period/category semantics outside the shared contract. Do not add a universal
commodity taxonomy, monthly cadence, identical identifier scheme, or
`UnitValue` hierarchy.
**Compatibility/migration:** preserve WV no-match versus reported-zero,
explicit units and periods, historical multiplicity, and Phase 4 fail-closed
aggregation; normalize publisher records only where their semantics are valid.
Ohio production adapter/mapping remains deferred until authoritative ODNR
production metadata is characterized.
**Proof:** existing WV adapter, production-tool, flow, codec, persistence, and
evaluation tests remain green; add contract tests for period/unit/value,
provenance, no-match/zero, and incompatible/duplicate fail-closed cases.
**Architecture check:** shared land does not import WV workbook or publisher
schemas; Ohio production support is not inferred from the shared projection.
**Risk:** medium/high because production semantics and aggregation are
fail-closed and publisher-specific.
**Rollback:** restore the unchanged WV `ProductionRecord` and workbook adapter
boundary without changing fixture bytes or persisted artifacts.
**Completion:** current WV production behavior is preserved through the shared
projection, unsupported semantics fail closed, and ODNR implementation remains
explicitly unstarted.

**Implementation note:** the shared projection uses explicit `value`, `unit`,
`period`, and `matchStatus`; WV commodity values map through
`toLandProductionRecords`. No Ohio adapter or commodity taxonomy was added.

### 6. Move WV assumptions out of reusable agent responsibility

**Status:** completed and committed in the current migration
**Move:** separate the jurisdiction-neutral responsibilities of
`land-case-intake`, `land-well-reconciler`, and `case-synthesizer` from WVDEP,
WVGES, WV source requirements, and WV-specific evidence expectations. Move
those requirements into WV flow/source policy and configuration. Keep source
acquisition, parsing, normalization, hashing, dates, coordinates, and
arithmetic outside agent judgment.
**Destination:** neutral agent prose/inputs where justified; WV policy and
`wv-land-well-reconciliation` flow configuration for source requirements and
independence.
**Compatibility:** preserve the current WV prompt outputs and routes while
moving runtime execution mechanics behind the neutral port.
**Proof:** prompt/evaluation cases must continue to prove evidence grounding,
WVDEP/WVGES source independence, preserved conflicts/unknowns, human review,
and no-title-proof behavior after publisher names are removed from reusable
prompts.
**Architecture check:** reusable prompts contain no required WV publisher
identity; WV policy contains the independence rule.
**Risk:** medium.
**Rollback:** restore the prior prompt text while retaining policy tests.

### 7. Separate WV jurisdiction and publisher implementations

**Status:** completed and committed in the current migration
**Move:** WVDEP/WVGES source identities, field maps, parsers, WV identifier and
status rules, production adapter, WV tools, and source-independence policy out
of the shared land directory.
**Destination:** `src/domains/land-administration/jurisdictions/wv/`, with
publisher adapters below it.
**Compatibility:** retain the `wv-land-well-reconciliation` flow ID and fixture
paths; change only imports and composition. WVDEP/WVGES remain two adapter
instances and two source identities.
**Proof:** adapter fixtures, field mapping expectations, source-independence
checks, production no-match checks, and full baseline suite.
**Architecture check:** shared land has no WV imports; WV may import land and
shared evidence.
**Risk:** medium/high.
**Rollback:** restore the old directory composition without changing fixture
bytes.

### 8. Extract generic agent-execution responsibility

**Status:** completed and committed in the current migration
**Move:** separate typed ordered-step and agent-execution mechanics from the
WV-shaped `WvAgentExecutor` request/result/policy. The generic boundary accepts
an agent identifier and domain-owned request and returns a domain-owned result
or explicit execution failure with deterministic step/provenance metadata. Do
not move `WvFlowInput`, `WvFlowResult`, WV source-selection policy, or land
evidence semantics into core.
**Destination:** generic execution boundary consumed by `typed-flow.ts`; a
thin WV composition adapter owns WV/land payloads and policy. No generic
factory, DI framework, plugin system, executor hierarchy, or abstract base
class.
**Compatibility:** behavior-preserving extraction; retain the current three
agent IDs, structured outputs, ordered required-step validation, and blocked
dependent-step behavior.
**Proof:** existing flow tests plus a contract test with an opaque request and
result proving the generic boundary has no WV/domain imports.
**Architecture check:** core cannot import WV, land, publisher, or source
policy; domain composition adapts its own payloads at the boundary.
**Risk:** medium.
**Rollback:** restore the WV adapter over the unchanged typed-flow mechanics.

**Implementation note:** `src/core/agent-execution.ts` defines the opaque
execution port. WV retains its payload-specific executor and adapts it at the
composition boundary; reusable agents no longer name WV publishers. WV source
and title-proof requirements are explicit in `src/domains/wv-land/policy.ts`.

### 9A. Extract Persistence A: atomic file/publication primitives

**Status:** completed and committed in the current migration
**Move:** temp write, fsync/rename/publication behavior where applicable,
recovery/cleanup rules, and JSON-safe canonical serialization mechanics that do
not know `WvLandRunAggregate`.
**Destination:** generic file/publication infrastructure.
**Compatibility:** preserve current paths and write-once behavior.
**Proof:** partial-write, malformed-JSON, cleanup, and canonical-serialization
tests.
**Architecture check:** no land or WV imports.
**Risk:** medium.
**Rollback:** restore the old helper calls without changing artifacts.

### 9B. Establish Persistence B: durable run storage port/envelope

**Status:** completed in Step 0 and committed as `046db76`
**Move:** neutral run identity, run record, and storage port contracts; make
concrete file persistence implement them.
**Destination:** neutral run/storage contracts and injected concrete store.
**Compatibility:** retain the existing `RunRecord` JSON shape and CLI behavior;
move callers before deleting old names.
**Proof:** existing run-history and persistence tests plus import checks for
orchestrator → port and composition-root → concrete store.
**Architecture check:** generic orchestration does not import or instantiate
`FileRunStore`.
**Risk:** medium.
**Rollback:** restore the old store injection boundary.

### 9C. Extract Persistence C: review decision/history mechanics

**Status:** completed and committed in the current migration
**Move:** append-only decisions, revision lineage, and domain-neutral review
state transitions/invariants. Keep proposed routes and action payloads
domain-owned.
**Destination:** generic review lifecycle capability plus land review packet
projection.
**Compatibility:** preserve packet/decision JSON and Phase 6 state transitions.

**Proof:** approval, rejection, revision-request, duplicate decision, and
lineage tests.
**Architecture check:** generic review imports no land aggregate or publisher.

**Risk:** medium.
**Rollback:** retain the current WV review implementation.

### 9D. Establish Persistence D: land aggregate repository/composition

**Status:** completed and committed in the current migration
**Move:** land evidence relationships, land review packet projection, land
aggregate validation, and any jurisdiction-specific durable state.
**Destination:** land repository and WV composition; no `OhLandRunStore` clone.

**Compatibility:** preserve atomic/fail-closed publication, recovery,
case/run consistency, snapshot relationships, JSON safety, and no action on
approval.
**Proof:** all Phase 6 tests.
**Architecture check:** generic persistence has no `Well`, `WvFlowResult`, or
publisher imports.
**Risk:** high.
**Rollback:** restore WV aggregate composition over the generic capabilities.

**Implementation note:** generic write-once publication, canonical JSON safety,
and recursive freezing are in `src/storage/file-primitives.ts`. The existing
WV repository remains the land-owned composition over the neutral run store;
review lifecycle state transitions are in `src/review/lifecycle.ts`, while
packet, snapshot, route, and aggregate relationships remain domain-owned at
that boundary.

### 10. Preserve generic typed-flow behavior after execution extraction

**Status:** completed and committed in the current migration
**Move:** retain the demonstrated generic ordered-step validation and immutable
artifact boundary in `core`, now consuming the generic execution boundary from
Step 8.
**Destination:** core typed-flow mechanics; WV flow composition remains
WV-local.
**Compatibility:** preserve ordered required-step fail-closed behavior and the
current three agent IDs.
**Proof:** flow tests for valid output, validation failure, required evidence
failure, blocked dependent steps, case isolation, and source independence.
**Architecture check:** core cannot import land or jurisdiction; agents cannot
import adapters.
**Risk:** low/medium.
**Rollback:** restore the WV flow composition.

### 11. Layer land and jurisdiction evaluation policies

**Status:** completed and committed in the current migration
**Move:** finding/conflict/unknown grounding, case isolation, route and
production semantics into land grading; WV fixture IDs, field paths, parser
rules, and WVDEP/WVGES independence into WV policy/cases.
**Destination:** `src/evaluations/land-administration/` and
`src/evaluations/jurisdictions/wv.ts`.
**Compatibility:** `scripts/run-evals.ts` keeps the current WV command and
output meaning.
**Proof:** current WV deterministic/harness/behavioral cases and a synthetic
OH-shaped policy object that uses the first two layers without ODNR calls.
**Architecture check:** generic evaluation core has no WV strings; land grader
has no WV source IDs.
**Risk:** medium.
**Rollback:** compose the current WV evaluator behind the new core.

### 12. Add a second-jurisdiction design-only contract proof

**Status:** completed and committed in the current migration
**Move:** define an in-memory OH policy and adapter contract without live calls,
fixtures, or Ohio implementation.
**Destination:** design/test-only contract shape, not production OH code.
**Compatibility:** no catalog or production behavior change.
**Proof:** architecture test demonstrates reuse of generic evaluation,
evidence, land, persistence, and review mechanics.
**Risk:** low.
**Rollback:** remove the proof if it starts prescribing an unvalidated OH
schema.

**Implementation note:** typed-flow behavior remains in neutral core; land
evaluation policy is in `src/evaluations/land-administration`, WV policy is in
`src/evaluations/jurisdictions/wv.ts`, and the test-only OH-shaped policy proves
reuse without adding an Ohio adapter, fixture, catalog entry, or live call.

## Design-phase acceptance status

The following records the documentation/design decision, not completed code
migration. The implementation checkboxes above remain open until the later
steps are performed and verified.

1. **PASS** — WV remains the flagship, not a runtime assumption.
2. **PASS** — shared land administration is distinct from WV.
3. **PASS** — `Finding`, `Conflict`, and `Unknown` are shared judgment
   contracts; conflicts and unknowns are transported only inside an
   aggregate-scoped container whose case/run scope is validated.
4. **PASS** — jurisdiction semantics and publisher parsing are distinct.
5. **PASS** — `SourceAdapter` remains distinct from `RetrievalProvider`.
6. **PASS** — WVDEP and WVGES remain independent evidence sources.
7. **PASS** — Ohio is designed as primarily additive; implementation remains
   deferred, while shared Well/ProductionRecord projections stay minimal and
   Ohio production mapping remains deferred pending ODNR metadata.
8. **PASS** — Pennsylvania is used as a counterexample and sanity check.
9. **PASS** — generic evaluation mechanics, land semantics, and WV cases are
   separate responsibilities.
10. **PASS** — persistence is decomposed into independently testable A/B/C/D
    steps.
11. **PASS** — agents remain bounded evidence-based judgment components.
12. **PASS** — deterministic parsing, normalization, arithmetic, hashing, and
    dates remain outside agent judgment.
13. **PASS** — flows own sequencing and routing.
14. **PASS** — human review remains required before consequential action.
15. **PASS** — public well/regulatory evidence is not title proof.
16. **PASS** — no 50-state framework or speculative registry is proposed.
17. **PASS** — migration is incremental, test-bounded, and rollback-aware,
   including behavior-preserving Well, ProductionRecord, and agent-execution
   extraction steps.
18. **PASS** — Phase 1–7 behavior remains the compatibility baseline.

## Cross-step verification

Run after each implementation step and before declaring the architecture
ready:

```sh
node --version
npm run typecheck
npm test
npm run build
npm run validate:records
git diff --check
```

The migration must not run live source acquisition or change frozen fixture
behavior. `npm run validate:records` currently reports
pre-existing record-heading issues in historical records 001–004; future
implementation work must distinguish those baseline findings from new
failures rather than weakening validation.

The design establishes only a minimal shared production observation projection.
It deliberately does not establish complete Ohio production semantics. Official
ODNR production metadata must be collected and compared before implementing the
Ohio production adapter or mapping.

## Risks and deferred work

- The current `src/evaluations/wv-land.ts` is a large coupled module; extract
  seams by behavior and tests, not by mechanically splitting every function.
- `SourceIdentity.mechanism` currently has a closed WV union. Generalize only
  when the evidence layer is extracted; do not predict every future transport.
- Coordinate and production abstractions are particularly vulnerable to false
  uniformity. Retain raw values and explicit provenance.
- Do not add Ohio or Pennsylvania source adapters, fixtures, catalog entries,
  agent/flow definitions, or live endpoint tests in this phase.
- H6A, broad production integration, county title/deed sources, OCR, UI,
  cloud-provider implementation, distributed orchestration, retries, and
  consequential actions remain deferred.

## Decision log

1. WV remains the flagship and the compatibility baseline; WV is not promoted
   into shared land or runtime vocabulary.
2. Evidence/judgment/review envelopes are extracted before shared land facts so
   land contracts do not become the accidental generic layer.
3. `SourceAdapter` remains a publisher/jurisdiction mapping boundary distinct
   from generic byte retrieval.
4. OH and PA are validation evidence for seams, not implementation scope.
5. No universal well or production schema is approved; shared contracts stay
   minimal and preserve raw/source-specific extensions.
6. Generic mechanics are extracted only where the current implementation or
   demonstrated jurisdictions prove a reusable responsibility.
7. `Conflict` and `Unknown` are extracted behind an aggregate-inherited
   case/run scope invariant; standalone unscoped persistence is rejected.
8. `LandWell`, `LandProductionRecord`, and the generic responsibility behind
   `WvAgentExecutor` are extracted now; WV publisher facts and policy remain
   WV-specific, and Ohio production adapter/mapping remains deferred until
   authoritative ODNR production metadata is characterized.

## Progress log

- 2026-09-04 — Phase 7.5 baseline verified at `b57c44f8d7486a4320b7a0f720e83e4e009220eb`; clean working tree confirmed.
- 2026-09-04 — Official WV, ODNR, PA DEP, and PASDA metadata/documentation consulted; no datasets downloaded.
- 2026-09-04 — Architecture and extraction sequence documented as the implementation baseline.
- 2026-09-04 — Step 0 committed as `046db76`; neutral runtime contracts and explicit composition verified.
- 2026-09-04 — Steps 1–5 committed as `7d69a63` and `1986ba7`; architecture checks, reusable evaluation mechanics, shared evidence contracts, and minimal land projections verified.
- 2026-09-04 — Steps 6–12 committed as `ffed45c`; jurisdiction policy, opaque execution, file/review mechanics, layered evaluation, and design-only second-jurisdiction proof verified.
