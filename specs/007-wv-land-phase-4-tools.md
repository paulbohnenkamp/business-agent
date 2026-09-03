---
id: 007-wv-land-phase-4-tools
title: West Virginia land Phase 4 deterministic tools
status: completed
created: 2026-09-03
updated: 2026-09-03
result: results/007-wv-land-phase-4-tools.md
---

## Goal

Implement the exact, reusable WV-land operations required by Phase 4: API and
permit normalization, name normalization, precision-preserving date handling,
coordinate distance, SHA-256 hashing, production aggregation, and identifier
comparison.

## Non-goals

This slice does not implement agents, skills, flows, reconciliation judgments,
finding persistence, human review integration, evaluations, UI, live-source
orchestration, H6A parsing, title or ownership conclusions, or consequential
actions. Frozen Phase 2 raw fixtures must not change.

## Current-state findings

- Phase 1 provides the `Well`, `ProductionRecord`, and source-evidence
  contracts.
- Phase 2 provides authentic, hash-verified WVDEP/WVGES evidence and a
  production no-match fixture.
- Phase 3 provides independent source adapters and normalized records, but
  exact comparison/aggregation operations are not yet reusable tools.
- One adapter-local API helper is permissive; Phase 4 needs a strict public
  normalization boundary without changing source independence.

## Chosen approach

Add one cohesive pure module per deterministic responsibility under
`src/domains/wv-land/tools/`. Return typed records for ambiguous/unknown
comparisons instead of inventing facts. Use a precision-aware date value with
year and optional month/day. Use a spherical haversine approximation with an
explicit datum assumption and caller-selected units/tolerance. Aggregate only
compatible evidence-bearing production values, reject invalid, duplicate, and
overlapping inputs, and carry relevant evidence IDs through every result.

## Alternatives considered

- Stateful tool classes were rejected because these operations have no provider,
  persistence, or lifecycle state.
- A generic utilities module was rejected because it would obscure domain
  responsibility and invite unrelated helpers.
- Treating absent production as zero was rejected because the fixture and
  architecture distinguish no-match from reported zero.
- Inferring missing date precision was rejected because source precision is
  evidence and effective dates are not derivable from it.

## Affected files or modules

- `src/domains/wv-land/tools/identifiers.ts`
- `src/domains/wv-land/tools/names.ts`
- `src/domains/wv-land/tools/dates.ts`
- `src/domains/wv-land/tools/coordinates.ts`
- `src/domains/wv-land/tools/hashing.ts`
- `src/domains/wv-land/tools/production.ts`
- `src/domains/wv-land/index.ts`
- `tests/wv-land-tools.test.ts`
- this spec and its matching result

## Milestones

1. Add typed deterministic tool modules and exports.
2. Add flagship and synthetic edge-case tests, including failure boundaries.
3. Run the complete Phase 1–4 verification suite and inspect the diff.

## Acceptance criteria

- API normalization accepts known formatting variants and rejects ambiguous
  values.
- Name normalization is deterministic and retains the original value for
  evidence.
- Dates preserve source precision and never invent an effective date.
- Coordinate comparison records datum assumptions and returns a documented
  distance.
- Production aggregation preserves units, periods, and source evidence IDs.
- Hashing is tested against known values.
- Exact operations are not implemented in agent prompts.

## Verification commands

```sh
node --version
npm run typecheck
node --import tsx --test tests/wv-land-tools.test.ts
node --import tsx --test tests/wv-land-contracts.test.ts tests/wv-land-fixtures.test.ts tests/source-retrieval.test.ts tests/wv-land-adapters.test.ts
npm test
npm run build
git diff --check
npm run validate:records
```

## Risks and open questions

- The existing Phase 3 adapter parser remains limited to its captured annual
  workbook format and system `unzip`; neither is expanded here.
- Date comparison semantics for different precisions must remain explicit and
  must not claim equality when the available precision cannot support it.

## Progress log

- 2026-09-03: Inspected the clean committed Phase 1–3 repository and derived
  the Phase 4 slice from the authoritative implementation plan.
- 2026-09-03: Approved this focused implementation scope from the explicit
  Phase 4 request; implementation in progress.
- 2026-09-03: Implemented and verified all Phase 4 deterministic tools and
  offline flagship/edge-case tests.
- 2026-09-03: Remediated review findings with provenance-aware conservative
  aggregation, fail-closed coordinate units, structural Gregorian validation,
  and expanded boundary tests.

## Decision log

- 2026-09-03: Kept all tools pure because they transform explicit values and
  own no external boundary or lifecycle.
- 2026-09-03: Kept source evidence IDs in aggregation output and represented
  absent values as absent rather than zero.
- 2026-09-03: Kept date precision explicit and returned overlapping rather than
  exact matches when one source date is less precise.
