---
id: 007-wv-land-phase-4-tools
title: West Virginia land Phase 4 deterministic tools
status: completed
completed: 2026-09-03
spec: specs/007-wv-land-phase-4-tools.md
---

## What changed

Added cohesive pure WV-land tools for strict API and permit normalization,
name normalization, precision-preserving date parsing/comparison, declared-unit
coordinate distance, SHA-256 hashing, identifier comparison, and production
aggregation. Exported them through the WV-land index. Aggregation now consumes
evidence-bearing records and returns explicit aggregated, no-evidence,
incompatible, or invalid-input results. It retains periods, units represented
by field names, and all relevant evidence IDs; absent production remains absent.

## Files changed

- `src/domains/wv-land/tools/identifiers.ts`
- `src/domains/wv-land/tools/names.ts`
- `src/domains/wv-land/tools/dates.ts`
- `src/domains/wv-land/tools/coordinates.ts`
- `src/domains/wv-land/tools/hashing.ts`
- `src/domains/wv-land/tools/production.ts`
- `src/domains/wv-land/index.ts`
- `tests/wv-land-tools.test.ts`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`
- `specs/007-wv-land-phase-4-tools.md`

## Checks run and results

- `node --version` — v24.14.1
- `npm run typecheck` — passed
- targeted Phase 1–3 and Phase 4 tests — passed, 38 tests
- `npm test` — passed, 70 tests
- `npm run build` — passed; existing Next.js package-lock tracing warning only
- `git diff --check` — passed
- `npm run validate:records` — the Phase 4 records validate; pre-existing
  missing-heading findings remain in records 001–004.
- `rg -n -i 'wvdep|wvges|west virginia' src/core` — no matches
- raw Phase 2 fixture hashes and byte lengths remain unchanged.

## Deviations from the spec

- The aggregation input is deliberately strengthened from bare
  `ProductionRecord` values to `WvProductionEvidence` so source compatibility
  and provenance can be checked deterministically. The Phase 3 adapter contract
  and production parser scope remain unchanged.

## Important decisions

- API normalization accepts only ten digits or consistent WV group separators;
  mixed separators and malformed values are rejected.
- Date comparison reports overlap when a less precise source date could contain
  the more precise date; it never invents an effective date.
- Coordinate comparisons use a spherical haversine approximation with a
  declared unit and explicit WGS84-compatible datum assumption; this is for
  deterministic proximity comparison, not cadastral or survey measurement.
- Aggregation rejects non-finite values, malformed periods or evidence IDs,
  incompatible source identities, duplicate evidence, and overlapping periods.
- Phase 3's local API digit parser remains unchanged: it faithfully interprets
  its documented source representation, while Phase 4's public identifier
  normalizer defines strict comparison semantics.
- WVDEP and WVGES evidence is only compared in tests; records are not merged.

## Remaining follow-ups

- Phase 5 owns the flagship agents and flow.
- Phase 6 owns durable findings, provenance integration, and human review.
- H6A, live-source orchestration, and legacy records 001–004 remain deferred.

## Self-review findings

The complete Phase 4 diff was reviewed read-only. It contains only the planned
deterministic tools, exports, tests, records, and Phase 4 status documentation.
No agent behavior, premature reconciliation, source-authority selection, title
assertion, live endpoint dependency, fixture mutation, core WV leakage,
API-specific hardcoding, zero-production fabrication, or god service was found.
Aggregation rejects non-finite values, incompatible sources, duplicate
evidence, and overlapping periods before arithmetic; no-evidence and reported
zero remain distinct.

## Must fix before commit

- None.

## Should improve before commit

- None within Phase 4. The repository-wide record validator still needs the
  unrelated legacy records 001–004 repaired in a separate cleanup.

## Commit recommendation

YES. The working tree is intentionally left uncommitted for review, as
requested.
