---
id: 009-wv-land-phase-6-persistence-review
title: West Virginia land Phase 6 persistence and human review
status: completed
created: 2026-09-03
updated: 2026-09-03
result: results/009-wv-land-phase-6-persistence-review.md
---

## Goal

Persist the validated structured result of the Phase 5
`wv-land-well-reconciliation` flow as a durable, provenance-preserving case
run aggregate and add an append-only human-review lifecycle for that result.
Prior runs, source snapshot associations, findings, conflicts, unknowns, and
review decisions must remain independently retrievable without turning review
approval into a consequential action.

## Non-goals

This slice does not add agent intelligence, behavioral evaluations, prompt-
injection testing, a case UI, interactive chat, live WV-source orchestration,
Microsoft Foundry integration, credentials, H6A support, title or ownership
determination, deed or county-record integration, legal conclusions, filing,
payment, registry mutation, owner/counterparty communication, or any other
consequential execution. It does not introduce a database, event-sourcing
platform, distributed transaction system, message bus, general workflow
engine, speculative locking, or a new raw-byte/blob storage subsystem.

## Architectural boundary

Agents continue to own bounded evidence-based judgments. Skills continue to
own reusable procedures. The WV flow continues to own sequencing and
branching. Deterministic TypeScript owns validation, identifiers,
serialization, persistence mechanics, and review transition rules.

The Phase 5 structured contracts remain canonical. Markdown agent output is
presentation only. Persistence and review infrastructure must not infer title,
ownership, publisher precedence, legal effect, or any other business judgment.
WV-specific semantics remain under `src/domains/wv-land`; `src/core` receives
only generic run-history or artifact-reference mechanics that are genuinely
reusable.

## Current-state findings

- Phase 1 provides validated `Finding`, `Conflict`, `Unknown`, evidence,
  snapshot, and provenance contracts with focused JSON codecs.
- Phase 2 provides frozen raw public-source fixtures and snapshot manifests.
- Phase 3 adapters acquire and hash source bytes but do not define a Phase 6
  raw-byte persistence subsystem.
- Phase 4 provides deterministic WV normalization and aggregation results.
- Phase 5 provides validated transient `WvFlowResult`, step artifacts,
  structured findings, conflicts, unknowns, evidence references, source
  snapshots, and proposed routes. It intentionally keeps these outside
  `RunService`.
- `RunService` and `FileRunStore` persist generic Markdown-oriented run
  records. `RunRecord` has run status, timestamps, flow/version, outputs,
  errors, handoffs, and basic `pending-human-review`, `approved`, and
  `rejected` review status, but no typed WV result, snapshot-set, retrieval,
  or revision-history support.
- `FileRunStore` has save/get but no list/query API and does not yet specify
  atomic replacement or append-only review persistence.
- `WvFlowResult` documents `complete`, `incomplete`, and `failed`, while the
  current Phase 5 implementation returns `complete` for successful execution
  and `failed` for typed execution or acquisition failure. Phase 6 must
  preserve the actual status and must not manufacture `incomplete` values.

## Chosen approach

Persist one cohesive aggregate rooted at:

```text
Case
  -> Run
       -> validated WvFlowResult
       -> source snapshot/evidence associations
       -> review packet
            -> append-only review decision history
```

`Finding`, `Conflict`, and `Unknown` remain the existing Phase 1 business
contracts contained in or associated with the persisted flow result. Do not
create `DurableFinding`, `PersistedConflict`, `DurableUnknown`, or a
repository-per-type model. Where a conflict or unknown needs durable case,
run, or snapshot context that its existing contract does not carry directly,
use a validated association/envelope around the existing record. The
envelope is persistence context, not a parallel business-state model.

The persistence boundary accepts only a validated `WvFlowResult` and its
validated input/evidence context. It deterministically serializes the
aggregate, validates all relationships before writing, reloads through the
existing WV codecs, and fails closed on malformed or inconsistent persisted
state. Historical runs and decisions are never overwritten by later runs,
refreshes, or revisions.

Filesystem persistence is the initial deterministic implementation. Use
temporary roots in tests and existing filesystem patterns where appropriate.
Write complete records using a safe temporary-file-then-replace operation
where replacement is necessary; use exclusive or append-only creation for
immutable snapshot associations and review decisions. Do not add distributed
concurrency machinery. If the local filesystem cannot guarantee the required
operation, return a persistence failure rather than silently accepting a
partial record.

## Aggregate and persistence model

The aggregate must retain, at minimum:

- case ID and synthetic submitted-package identity;
- run ID, flow ID/version, run status, timestamps, and step records;
- the complete validated `WvFlowResult`, including successful structured
  findings, conflicts, unknowns, synthesis, proposed route, and execution
  failure when present;
- the exact source snapshot IDs and serialized snapshot metadata associated
  with the run;
- evidence IDs used by the result and their snapshot relationships;
- producer and producer-version information from finding provenance;
- review packet identity and immutable decision history.

The durable result must preserve successful business uncertainty as structured
business state. It must preserve execution failure, validation failure,
blocked steps, and required evidence-acquisition failure as failure state. A
failed result is not converted to `unknown`, `inconclusive`, `incomplete`, or
an eligible recommendation merely because it is persisted. A successful
result containing unknowns or unresolved conflicts remains successfully
executed business uncertainty.

## Run-history integration

Keep the existing generic `RunService` responsible for run identity,
lifecycle timestamps, generic status, flow/version, audit linkage, and
generic artifact references. It must not understand WV `Finding`, `Conflict`,
or `Unknown` semantics and must not force the typed WV flow through the
Markdown-oriented agent loop.

Prefer a narrow typed-flow integration point or a small
`WvLandRunService` application service that invokes the existing Phase 5
typed flow, then persists the validated WV aggregate and associates it with a
generic run record. Extend `RunRecord` or `RunStore` only with generic fields
needed to reference a structured result, source snapshot IDs, or review
linkage. Do not rewrite the orchestrator or merge text and typed execution
models merely for reuse.

Required retrieval operations are deliberately small:

- get one exact run by run ID;
- list prior runs/results for one case ID;
- get the exact structured result and snapshot set for a run;
- get the exact review packet and its decision history.

No general query language or snapshot-centric global query API is required.

## Snapshot and evidence association

Phase 6 owns durable association of a run with the immutable source snapshot
set and evidence it used. It persists or references the established snapshot
identity and metadata: source identity, request URL, retrieval time, dates,
content type, SHA-256 hash, raw snapshot reference, byte length, parser
version, and immutable marker.

Phase 6 does not acquire source bytes or add blob/object storage. Phase 3
retrieval remains responsible for acquisition and hashing. Phase 2 raw
fixtures remain immutable. A later refresh must create a new snapshot identity
and new run association; it must never mutate historical snapshot metadata,
evidence, or result associations.

## Review model and lifecycle

The three layers remain distinct:

```text
agent proposed route -> durable review packet -> human review decision
                                              -> possible future action
```

Phase 6 implements only the first two layers. Approval, rejection, or
revision request is not a filing, payment change, registry update,
communication, title determination, or invocation of
`ConsequentialActionGateway`.

A review packet identifies the exact case, run, structured result, proposed
route, source snapshot set, and review state. The proposed states are:

- `pending-human-review`;
- `approved`;
- `rejected`;
- `revision-requested`.

Allowed transitions are:

```text
pending-human-review -> approved
pending-human-review -> rejected
pending-human-review -> revision-requested
revision-requested   -> pending-human-review  (through a new revised run)
```

Every decision is immutable and append-only. It records a decision ID,
packet ID, case ID, exact run/result ID, exact snapshot IDs reviewed,
reviewer identity, decision time, decision kind, reason, and optional lineage
such as `supersedes` or `revises`. A revision request never edits the prior
result or decision. The revised execution creates a new run and review packet
linked to the prior lineage.

Only successfully executed structured results are eligible for a normal
review recommendation. A successful result may require review because it
contains unknowns, unresolved conflicts, or a proposed human route. A result
with a runtime, validation, required-step, or required-evidence execution
failure is not eligible for approval as a normal business recommendation;
its failure remains visible and may be routed for remediation or a new run,
but persistence must not make it reviewable by changing its status.

## Identity and integrity invariants

Before persistence and after reload, enforce:

- aggregate case ID equals the submitted package, flow result, and all finding
  case IDs;
- run ID is consistent across run history, flow result, finding provenance,
  review packet, and decision records;
- every evidence reference resolves within the durable evidence context;
- every evidence record resolves to a snapshot in the run's recorded snapshot
  set;
- every snapshot ID corresponds to immutable, internally consistent metadata;
- review packets point to the exact immutable run/result and snapshot set;
- decisions point to an existing exact review packet;
- revision lineage points to prior immutable records and never overwrites
  them;
- malformed JSON, missing required fields, unknown states, duplicate
  immutable IDs, or broken references fail closed.

Do not add cryptographic signing, distributed locking, or stronger integrity
claims than the established content hashes and relationship validation
require.

## Alternatives considered

- Separate repositories for findings, conflicts, unknowns, snapshots, and
  every result component were rejected because the architecture establishes a
  cohesive case/run aggregate and no independent lifecycle requirement has
  been demonstrated.
- New durable business types were rejected because they would duplicate the
  Phase 1 contracts and create competing canonical models.
- A database or event-sourcing design was rejected because Phase 6 requires
  deterministic local persistence, not production-scale infrastructure.
- Extending the Markdown `RunService` loop to execute typed WV steps was
  rejected because Phase 5 explicitly separated typed execution from legacy
  text execution.
- Mutating a review packet or prior result for revision was rejected because
  review history and source provenance must remain append-only.
- Approval-triggered action requests were rejected because approval and
  consequential execution are separate control boundaries.
- Persisting raw bytes in a new Phase 6 subsystem was rejected because source
  acquisition and hashing belong to Phase 3 retrieval and live refresh belongs
  to Phase 9.

## Affected files or modules

Likely implementation locations, subject to inspection during implementation:

- `src/domains/wv-land/` persistence and review modules;
- `src/domains/wv-land/serialization.ts` or a focused durable codec module;
- `src/core/orchestrator.ts` for minimal generic run metadata, if required;
- `src/core/storage.ts` for generic run retrieval or safe-write extensions;
- `src/domains/wv-land/index.ts` exports;
- `tests/wv-land-persistence.test.ts`;
- `tests/wv-land-review.test.ts`;
- `tests/architecture.test.ts` and `tests/wv-land-flow.test.ts` extensions;
- this implementation plan and the matching Phase 6 result record after
  completion.

These are candidate boundaries, not a requirement to create every file or
class. Implementation should keep the smallest cohesive aggregate service
that satisfies the acceptance criteria.

## Milestones

1. Confirm the durable aggregate and association-envelope shape against the
   existing Phase 1 codecs and Phase 5 flow contracts.
2. Implement validated filesystem persistence and safe reload for structured
   WV run aggregates.
3. Add narrow run-history integration and exact snapshot/evidence retrieval.
4. Implement append-only review decisions, legal transitions, and revision
   lineage through new runs.
5. Add deterministic persistence, integrity, retrieval, and review tests.
6. Run the complete Phase 6 verification suite and inspect persisted records.

## Proposed implementation sequence

1. Confirm the smallest durable aggregate shape and compatibility with the
   existing Phase 1 codecs and Phase 5 flow contracts.
2. Define validated persistence-context and review records without duplicating
   WV business contracts.
3. Implement deterministic filesystem aggregate persistence and safe reload.
4. Add narrow generic run-history references or a WV application-service seam.
5. Persist and retrieve exact snapshot/evidence associations.
6. Implement append-only review decisions and legal transition validation.
7. Implement revision lineage through new runs and new review packets.
8. Add deterministic tests for all integrity, failure, retrieval, and review
   requirements.
9. Run the complete Phase 6 verification commands and inspect persisted files
   directly.

## Acceptance criteria

- A validated Phase 5 structured flow result can be persisted and reloaded
  without losing findings, conflicts, unknowns, synthesis, proposed route,
  step records, or execution failure.
- `Finding`, `Conflict`, and `Unknown` remain the Phase 1 contracts; no
  parallel durable business models are introduced.
- Finding evidence links, conflict claim evidence links, unknown reasons, and
  finding provenance survive persistence and reload.
- A durable run records the exact source snapshot set and associated evidence
  context used by that run.
- Two runs for one case remain independently retrievable by run ID and case
  history.
- A later snapshot association creates a new historical identity and does not
  mutate an earlier run, evidence record, or snapshot association.
- Malformed persisted state, case/run/provenance mismatches, missing evidence
  or snapshot references, duplicate immutable records, and broken review
  references fail closed.
- Execution failure remains failure after persistence and reload.
- Successfully executed business uncertainty remains business uncertainty
  after persistence and reload.
- A review packet references the exact immutable run, structured result, and
  snapshot set.
- Approval, rejection, and revision-request decisions are supported and
  recorded with reviewer, time, reason, exact run, and snapshot context.
- Review decisions are append-only; a revision produces or links to a new run
  and review packet without mutating prior state.
- Illegal review transitions are rejected.
- Provider/runtime execution failure is not made eligible for approval as a
  normal business recommendation.
- Approval never invokes `ConsequentialActionGateway` and does not create or
  execute a consequential action request.
- Prior exact runs, case history, snapshot associations, and review history
  are retrievable without confusing persisted state with current transient
  execution.
- Persistence is deterministic, locally testable, independent of Foundry and
  live WV endpoints, and uses safe complete-record writes where replacement
  is necessary.
- `npm run typecheck`, targeted Phase 6 tests, `npm test`, `npm run build`,
  `git diff --check`, and record validation pass, with persisted JSON inspected
  directly.

## Deterministic test plan

Use temporary filesystem roots, injected clocks/IDs where practical, the
existing frozen WV fixtures, and no network access. Cover at least:

- persist/reload of a complete structured result;
- preservation of `Finding`, `Conflict`, and `Unknown` using the existing
  contracts;
- preservation of evidence IDs, provenance, producer, and producer version;
- preservation of the exact source snapshot set;
- independent retrieval of two runs for one case;
- later snapshot association without mutation of the prior run;
- malformed persisted state failing closed;
- case mismatch, run/provenance mismatch, missing evidence, and missing
  snapshot reference rejection;
- execution failure remaining failure after reload;
- successful business uncertainty remaining uncertainty after reload;
- exact review-packet references to run, result, and snapshots;
- approval, rejection, revision request, and illegal transition rejection;
- append-only decisions and new-run revision lineage;
- approval not invoking a consequential-action gateway;
- persistence remaining independent of Foundry and live WV endpoints.

## Verification commands

```sh
node --version
npm run typecheck
node --import tsx --test tests/wv-land-persistence.test.ts tests/wv-land-review.test.ts tests/wv-land-flow.test.ts tests/wv-land-contracts.test.ts tests/source-retrieval.test.ts
npm test
npm run build
git diff --check
npm run validate:records
```

## Explicit deferrals and phase boundaries

Phase 7 remains responsible for behavioral agent evaluations, prompt
injection, prohibited-claim behavior, cross-case LLM behavior, and evaluation
of routing quality.

Phase 8 remains responsible for the case-centered UI, interactive review UI,
evidence presentation, run-history presentation, and chat/case copilot.

Phase 9 remains responsible for live WV refresh orchestration,
Microsoft/Foundry integration, credentials, provider integration, and source
availability/schema-change behavior in live mode.

Title determination or certification, deed/county title integration, legal
conclusions, filing, payment, registry mutation, owner/counterparty
communication, consequential execution, and H6A support remain outside this
phase and the stated flagship scope.

## Risks and open questions

- The exact generic `RunRecord` extension versus a WV-domain application
  service must be selected during implementation without leaking WV concepts
  into `src/core`.
- The repository currently has no list/query operation on `FileRunStore`; the
  smallest deterministic case-history index or listing extension must be
  chosen.
- The current Phase 1 `Conflict` and `Unknown` shapes do not carry direct
  case/run/provenance fields. The implementation must choose and validate an
  association envelope without duplicating those business contracts.
- The existing `FileRunStore` write behavior is not explicitly atomic. The
  implementation must define the narrow safe-write operation needed for
  complete records and reject partial/corrupt state on reload.
- The Phase 3 retrieval provider returns snapshot bytes and metadata but does
  not persist raw bytes. Phase 6 must persist established metadata and raw
  references only, leaving byte storage to the existing retrieval boundary
  and future live-source work.
- The exact representation of a successful `incomplete` Phase 5 result is not
  currently emitted. Phase 6 must preserve the contract if such a result is
  later supplied, but must not manufacture one.

## Progress log

- 2026-09-03: Derived the Phase 6 objective, aggregate boundary, persistence
  scope, review lifecycle, invariants, tests, and deferrals from the approved
  interpretation and committed WV architecture.
- 2026-09-03: Created this approved specification.
- 2026-09-03: Implemented and verified the Phase 6 aggregate persistence,
  snapshot/evidence associations, generic run-history references, review
  lifecycle, append-only decisions, and revision lineage.
- 2026-09-03: Remediated status, relationship, snapshot-provenance,
  publication-consistency, lineage, and JSON-safe persistence invariants.

## Decision log

- 2026-09-03: Chose a cohesive Case -> Run -> structured result -> review
  packet aggregate rather than repository-per-record persistence.
- 2026-09-03: Kept `Finding`, `Conflict`, and `Unknown` as the canonical
  business contracts; additional persistence context must use association
  envelopes rather than duplicate models.
- 2026-09-03: Limited Phase 6 snapshot work to immutable run/evidence
  associations and established snapshot metadata/references; raw-byte storage
  remains outside this phase.
- 2026-09-03: Made review decisions append-only and revision lineage-based;
  revisions create new runs and packets rather than mutating historical state.
- 2026-09-03: Kept proposed route, human decision, and consequential action as
  separate concepts; approval cannot invoke an action gateway.
- 2026-09-03: Chose narrow RunService integration and rejected forcing typed WV
  execution through the legacy Markdown runner.
- 2026-09-03: Resolved failure semantics by requiring faithful persistence of
  the Phase 5 status and explicitly refusing to convert failure into
  uncertainty or manufacture an `incomplete` status.
