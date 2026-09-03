---
id: 009-wv-land-phase-6-persistence-review
title: West Virginia land Phase 6 persistence and human review
status: completed
created: 2026-09-03
updated: 2026-09-03
completed: 2026-09-03
spec: specs/009-wv-land-phase-6-persistence-review.md
---

## What changed

Implemented Phase 6 durable persistence for the WV flagship. A cohesive
case/run aggregate now stores the validated Phase 5 structured result,
submitted synthetic package, exact source snapshot and evidence associations,
and optional human-review packet. Review decisions are immutable files and
review state is derived from their append-only history.

The WV application service writes narrow generic run-history references for
the structured result, source snapshots, and review packet. It does not route
typed WV execution through the legacy Markdown runner.

## Files changed

- src/core/orchestrator.ts
- src/domains/wv-land/flow.ts
- src/domains/wv-land/persistence.ts
- src/domains/wv-land/index.ts
- tests/wv-land-persistence.test.ts
- docs/WV_LAND_IMPLEMENTATION_PLAN.md
- specs/009-wv-land-phase-6-persistence-review.md
- results/009-wv-land-phase-6-persistence-review.md

## Persistence format and storage layout

Each aggregate is stored at:

cases/<case-id>/runs/<run-id>/aggregate.json

Eligible runs also receive:

cases/<case-id>/runs/<run-id>/review-packet.json
cases/<case-id>/runs/<run-id>/review-decisions/<decision-id>.json

Aggregate and decision creation uses temporary complete writes followed by
non-overwriting hard-link publication. Reload validates the persisted JSON,
contracts, identities, evidence references, snapshot associations, and
review relationships before returning frozen state.

## Review and revision behavior

Review packets support pending-human-review, approved, rejected, and
revision-requested. Only pending packets accept a decision. Decisions record
the reviewer, time, reason, exact run/result reference, and snapshot set.
Revision requests leave the old aggregate, packet, and decisions untouched;
a new run can explicitly reference the prior run and packet.

Only successfully executed structured results with synthesis are eligible for
normal human review. Execution failures remain failures and receive no review
packet. Approval never invokes ConsequentialActionGateway or any external
action.

## Checks run and results

- node --version: v24.14.1
- targeted Phase 1–6 tests: passed, 38 tests
- npm test: passed, 94 tests
- npm run typecheck: passed
- npm run build: passed; existing Next.js package-lock tracing warning only
- git diff --check: passed
- frozen Phase 2 fixture/hash tests: passed
- core leakage check: no WV, land, well, WVDEP, or WVGES semantics in
  src/core; only generic run/artifact and existing action-port contracts
- npm run validate:records: Phase 6 spec/result pair passes; legacy records
  001–004 retain pre-existing missing-section findings
- remediation tests directly cover impossible flow statuses, missing finding
  relationships, inconsistent evidence/snapshot provenance, revision-state
  and cross-case lineage, unsafe IDs, duplicate runs, JSON-lossy artifacts,
  and generic publication failure with deterministic recovery

## Deviations from the spec

- The existing generic RunService class was not broadened. The approved
  narrow boundary is implemented by WvLandRunService using the existing
  RunStore, while RunRecord gains only generic structured-artifact,
  snapshot, case, and review references.
- Review decisions are stored as append-only files and current packet state is
  derived rather than mutating the review packet.
- Phase 6 persists snapshot metadata and raw references only; it does not add
  raw-byte storage or live retrieval.

## Important decisions

- Finding, Conflict, and Unknown remain the Phase 1 contracts; persistence
  stores them inside the aggregate without durable parallel business models.
- Source snapshots and evidence remain associated by exact IDs, and WVDEP and
  WVGES are never merged.
- WvFlowResult status is preserved exactly. Failed execution is not converted
  to uncertainty or incomplete.
- Complete results cannot carry execution failures, and failed results cannot
  carry successful synthesis or receive a review packet.
- Generic run reload verifies the matching WV aggregate, snapshot references,
  structured result reference, and review linkage before exposing the result.
- Aggregate publication validates a JSON round-trip before writing the
  canonical file.
- Revision creates lineage to a new run and review packet instead of editing
  historical state.

## Remaining follow-ups

- Phase 7: fixture-backed behavioral and adversarial evaluations.
- Phase 8: case-centered UI, interactive review, and case copilot.
- Phase 9: opt-in live WV refresh and Microsoft/Foundry integration.
- Legacy execution-record findings in records 001–004 remain a separate
  cleanup task.

## Acceptance status

All Phase 6 acceptance criteria are satisfied. The implementation is ready
for review and has not been committed.
