# Multi-jurisdiction implementation plan

**Phase 7.5 status: design complete; implementation not started.**

This is a living, behavior-preserving checklist for the architecture in
[MULTI_JURISDICTION_ARCHITECTURE.md](MULTI_JURISDICTION_ARCHITECTURE.md). It
does not authorize Ohio or Pennsylvania implementation. The Phase 1–7 WV
behavior is the compatibility baseline.

## Global acceptance criteria

- [ ] WV remains the flagship jurisdiction, not a runtime assumption.
- [ ] Shared evidence/judgment/review is distinct from shared land
      administration and from WV implementation.
- [ ] Jurisdiction policy is distinct from publisher parsing and retrieval.
- [ ] `SourceAdapter` remains distinct from `RetrievalProvider`.
- [ ] WVDEP and WVGES remain independent evidence sources.
- [ ] Generic evaluation mechanics are independent from land grading and WV
      cases.
- [ ] Generic durable-run and review mechanics are independent from land
      aggregate state.
- [ ] Deterministic parsing, normalization, arithmetic, hashing, and dates
      remain services/tools, not agent responsibilities.
- [ ] Agents remain bounded evidence-based judgment components; flows retain
      sequencing/routing.
- [ ] Human review and the public-evidence-is-not-title-proof boundary remain
      explicit.
- [ ] No 50-state framework, plugin system, generalized DAG engine, or
      speculative registry is introduced.
- [ ] All Phase 1–7 tests and fixture behavior remain green after every step.

## Ordered extraction steps

### 0. Correct neutral runtime contracts and composition roots

**Status:** implemented and locally verified on 2026-09-04; pending independent
Step 0 review
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

**Status:** not started
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

### 2. Extract generic evaluation mechanics

**Status:** not started
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

### 3. Extract shared evidence, judgment, and JSON boundary contracts

**Status:** not started
**Move:** `SourceIdentity`, `SourceSnapshot`, generic `SourceEvidence<T>`,
`Provenance`, and `Finding`, plus their validation/codec mechanics. Generalize
source mechanism metadata without adding land fields. `Conflict` and `Unknown`
remain deferred until their aggregate-inherited case/run scope invariant is
implemented.
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

### 4. Establish the minimal shared LandWell projection

**Status:** not started
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

### 5. Establish the minimal shared LandProductionRecord projection

**Status:** not started
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

### 6. Move WV assumptions out of reusable agent responsibility

**Status:** not started
**Move:** separate the jurisdiction-neutral responsibilities of
`land-case-intake`, `land-well-reconciler`, and `case-synthesizer` from WVDEP,
WVGES, WV source requirements, and WV-specific evidence expectations. Move
those requirements into WV flow/source policy and configuration. Keep source
acquisition, parsing, normalization, hashing, dates, coordinates, and
arithmetic outside agent judgment.
**Destination:** neutral agent prose/inputs where justified; WV policy and
`wv-land-well-reconciliation` flow configuration for source requirements and
independence.
**Compatibility:** do not modify agents in Phase 7.5; during implementation,
make prompt changes with the current WV suite and preserve the same structured
outputs and routes.
**Proof:** prompt/evaluation cases must continue to prove evidence grounding,
WVDEP/WVGES source independence, preserved conflicts/unknowns, human review,
and no-title-proof behavior after publisher names are removed from reusable
prompts.
**Architecture check:** reusable prompts contain no required WV publisher
identity; WV policy contains the independence rule.
**Risk:** medium.
**Rollback:** restore the prior prompt text while retaining policy tests.

### 7. Separate WV jurisdiction and publisher implementations

**Status:** not started
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

**Status:** not started
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
dependent-step behavior. Agents and flows are not modified in Phase 7.5.
**Proof:** existing flow tests plus a contract test with an opaque request and
result proving the generic boundary has no WV/domain imports.
**Architecture check:** core cannot import WV, land, publisher, or source
policy; domain composition adapts its own payloads at the boundary.
**Risk:** medium.
**Rollback:** restore the WV adapter over the unchanged typed-flow mechanics.

### 9A. Extract Persistence A: atomic file/publication primitives

**Status:** not started
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

**Status:** not started
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

**Status:** not started
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

**Status:** not started
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

### 10. Preserve generic typed-flow behavior after execution extraction

**Status:** not started
**Move:** retain the demonstrated generic ordered-step validation and immutable
artifact boundary in `core`, now consuming the generic execution boundary from
Step 8.
**Destination:** core typed-flow mechanics; WV flow composition remains
WV-local.
**Compatibility:** preserve ordered required-step fail-closed behavior and the
current three agent IDs. Agent definitions are not modified in Phase 7.5.
**Proof:** flow tests for valid output, validation failure, required evidence
failure, blocked dependent steps, case isolation, and source independence.
**Architecture check:** core cannot import land or jurisdiction; agents cannot
import adapters.
**Risk:** low/medium.
**Rollback:** restore the WV flow composition.

### 11. Layer land and jurisdiction evaluation policies

**Status:** not started
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

**Status:** deferred until the prior steps pass
**Move:** define an in-memory OH policy and adapter contract without live calls,
fixtures, or Ohio implementation.
**Destination:** design/test-only contract shape, not production OH code.
**Compatibility:** no catalog or production behavior change.
**Proof:** architecture test demonstrates reuse of generic evaluation,
evidence, land, persistence, and review mechanics.
**Risk:** low.
**Rollback:** remove the proof if it starts prescribing an unvalidated OH
schema.

## Design-phase acceptance status

The following records the documentation/design decision, not completed code
migration. The implementation checkboxes above remain open until the later
steps are performed and verified.

1. **PASS** — WV remains the flagship, not a runtime assumption.
2. **PASS** — shared land administration is distinct from WV.
3. **PASS** — `Finding` is a candidate shared judgment contract; `Conflict`
   and `Unknown` are explicitly deferred until aggregate-inherited case/run
   scope is implemented.
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

The Phase 7.5 documentation phase itself must not run live source acquisition
or change production behavior. `npm run validate:records` currently reports
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
7. `Conflict` and `Unknown` are not extracted until their aggregate-inherited
   case/run scope invariant is implemented.
8. `LandWell`, `LandProductionRecord`, and the generic responsibility behind
   `WvAgentExecutor` are extracted now; WV publisher facts and policy remain
   WV-specific, and Ohio production adapter/mapping remains deferred until
   authoritative ODNR production metadata is characterized.

## Progress log

- 2026-09-04 — Phase 7.5 baseline verified at `b57c44f8d7486a4320b7a0f720e83e4e009220eb`; clean working tree confirmed.
- 2026-09-04 — Official WV, ODNR, PA DEP, and PASDA metadata/documentation consulted; no datasets downloaded.
- 2026-09-04 — Architecture and extraction sequence documented; implementation remains intentionally unstarted.
