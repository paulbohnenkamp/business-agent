---
id: 005-wv-land-phase-2-fixtures
title: West Virginia land Phase 2 evidence fixtures
status: completed
created: 2026-09-03
updated: 2026-09-03
completed: 2026-09-03
spec: specs/005-wv-land-phase-2-fixtures.md
---

## What changed

Captured and checked in a small historical fixture set centered on public API
`4700701733`. WVDEP layer 7 contributes three raw historical rows, WVGES
layer 4 contributes two raw historical rows, and the WVDEP 2025 annual
production workbook is retained as an exact snapshot with no matching row for
the selected API. The submitted package is explicitly synthetic and makes no
title assertion.

## Files changed

- `fixtures/wv-land/braxton-4700701733/manifest.json`
- `fixtures/wv-land/braxton-4700701733/input/submitted-land-package.json`
- `fixtures/wv-land/braxton-4700701733/raw/wvdep-well.json`
- `fixtures/wv-land/braxton-4700701733/raw/wvges-well.geojson`
- `fixtures/wv-land/braxton-4700701733/raw/wvdep-production.xlsx`
- `fixtures/wv-land/braxton-4700701733/normalized/wvdep-well.json`
- `fixtures/wv-land/braxton-4700701733/normalized/wvges-well.json`
- `fixtures/wv-land/braxton-4700701733/normalized/production.json`
- `tests/wv-land-fixtures.test.ts`
- `docs/WV_LAND_ARCHITECTURE.md`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`

The manifest records exact URLs, retrieval times, source IDs, content types,
SHA-256 hashes, byte lengths, raw references, parser metadata, and the
historical snapshot boundary. Raw files are immutable fixture inputs; the
normalized files are expected representations linked to those snapshots.

## Checks run and results

- `node --version` — v24.14.1
- `npm run typecheck` — passed
- `npm test` — passed, 47 tests
- `npm run build` — passed; existing Next.js package-lock tracing warning only
- `git diff --check` — passed
- Targeted `node --import tsx --test tests/wv-land-fixtures.test.ts` — passed,
  5 tests, including raw-to-normalized correspondence and direct XLSX
  no-match inspection.
- `npm run validate:records` — the new spec/result records validate, while the
  pre-existing records 001–004 still report unrelated missing required
  headings.

## Deviations from the spec

- The selected API has no row in the captured 2025 production workbook, so
  `normalized/production.json` records an empty match set rather than a
  fabricated or zero-valued production record.
- WVDEP’s projected coordinates were not converted to latitude/longitude in
  Phase 2; the raw `wellx`/`welly` values remain available for the future
  adapter/normalization phase.
- No `expected/` directory was needed because Phase 2 has no findings or
  review route; those artifacts belong to later adapter/evaluation work.

## Important decisions

- WVDEP and WVGES remain separate identities and records. Their differing
  operator values and WVGES historical rows are preserved for later
  reconciliation.
- Hashes and byte lengths are generated from the committed raw bytes and are
  checked offline by the fixture test.
- WVGES mineral and lease-related source fields remain raw evidence and are
  explicitly not treated as title proof.
- The fixture verifier now validates manifest-specific identities and
  relationships, compares important normalized fields to raw publisher rows,
  and independently scans worksheet XML/shared strings for the selected API.
- `normalized/production.json` now uses `resultType: "no-match"` to make its
  absence semantics explicit without introducing a generalized typed contract.
- The full production workbook remains a normal Git file for this first case;
  future comparable artifacts require a storage-strategy review.

## Remaining follow-ups

- Phase 3: implement fixture-backed WVDEP and WVGES source adapters and the
  WVDEP production workbook parser.
- Later phases: deterministic normalization tools, reconciliation judgments,
  findings, flow execution, evaluations, and optional live refresh.

## Acceptance status

All Phase 2 acceptance criteria are satisfied. Phase 3 was not started. Commit
recommendation: YES, after human review; no commit was created.
