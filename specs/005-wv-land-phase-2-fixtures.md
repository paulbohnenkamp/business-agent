---
id: 005-wv-land-phase-2-fixtures
title: West Virginia land Phase 2 evidence fixtures
status: completed
created: 2026-09-03
updated: 2026-09-03
result: results/005-wv-land-phase-2-fixtures.md
---

## Goal

Capture a small, reproducible, offline fixture set of authentic public West
Virginia oil-and-gas evidence for the documented Phase 2 architecture. Keep
WVDEP and WVGES independent, preserve exact raw bytes and provenance, and pair
the public evidence with an explicitly synthetic submitted land package.

## Non-goals

- No live source adapters, generalized ArcGIS client, workbook production
  parser, reconciliation logic, agents, flows, UI, Foundry integration, or
  live-source mode.
- No private person's lease, title, ownership, or financial records.
- No conclusion that public well or production records establish mineral title.

## Current-state findings

- Phase 1 contracts and JSON codecs are implemented under
  `src/domains/wv-land`.
- The repository has no WV fixture tree or fixture-integrity test.
- The working tree is clean.
- The verified public sources in the WV architecture document expose WVDEP
  layer 7, WVGES layer 4, and the WVDEP 2025 production workbook.

## Chosen approach

Use case `braxton-4700701733`, centered on API `4700701733` because it has a
WVDEP layer-7 record and two distinguishable WVGES layer-4 records: an older
completed well record and a later plugging record with different operator and
lease-related values. Capture the exact API-keyed WVDEP and WVGES GeoJSON
responses. Capture the exact WVDEP 2025 annual production workbook as the
production source snapshot and identify a single row in the normalized
expectation only if the captured workbook contains it. The synthetic input
uses the API, county, and well-number clues but asserts no private title or
lease claim.

Store artifacts under:

```text
fixtures/wv-land/braxton-4700701733/
  manifest.json
  input/submitted-land-package.json
  raw/wvdep-well.json
  raw/wvges-well.geojson
  raw/wvdep-production.xlsx
  normalized/wvdep-well.json
  normalized/wvges-well.json
  normalized/production.json
```

The manifest records the three source identities, exact retrieval URLs and
timestamps, source record IDs, content types, byte lengths, SHA-256 hashes,
raw references, parser versions, and the fixture version. Hashes and byte
lengths are generated from the committed raw bytes. Normalized records are
checked against Phase 1 codecs and preserve source identity/evidence links.

## Alternatives considered

- A broad bulk download was rejected because Phase 2 requires the smallest
  convincing reproducible set.
- A synthetic-only dataset was rejected because it would not prove authentic
  public evidence capture or snapshot integrity.
- Combining the WVDEP and WVGES records was rejected because independent source
  disagreement must remain visible for later reconciliation.

## Affected files or modules

- `fixtures/wv-land/braxton-4700701733/**`
- `tests/wv-land-fixtures.test.ts`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`
- `docs/WV_LAND_ARCHITECTURE.md` only if fixture-use documentation needs a
  narrow clarification.
- `results/005-wv-land-phase-2-fixtures.md` after verification.

No Phase 1 codec changes or `src/core` changes are planned.

## Milestones

1. Capture and inventory the three public snapshots; compute hashes from exact
   bytes.
2. Add normalized expected records and synthetic input without private data.
3. Add offline integrity, manifest, codec, provenance, and source-separation
   tests.
4. Update the Phase 2 verification record, run all checks, self-review the
   diff, and write the matching result.

## Acceptance criteria

- Each fixture has a complete manifest with source identity, source record ID,
  request URL, retrieval timestamp, hash, raw reference, and parser metadata.
- Raw WVDEP JSON, WVGES GeoJSON, and WVDEP XLSX bytes are committed and their
  SHA-256 and byte lengths are verified by tests.
- Normalized WVDEP, WVGES, and production expectations are committed and pass
  the Phase 1 JSON codecs.
- WVDEP and WVGES remain distinct sources and their disagreement/missing fields
  are preserved.
- The submitted package is clearly synthetic and contains no private title
  assertion.
- Tests are deterministic, fixture-backed, and do not access government URLs.

## Verification commands

```sh
node --version
npm run typecheck
npm test
npm run build
git diff --check
```

## Risks and open questions

- The public workbook may not contain the selected API; in that case the
  production fixture will retain one authentic workbook snapshot with an
  explicit no-matching-row normalized expectation rather than fabricate a
  production record.
- Public services and workbooks can change after capture; the recorded
  retrieval timestamp and content hash define this historical snapshot.

## Progress log

- 2026-09-03: Repository instructions, WV architecture, implementation plan,
  Phase 1 codecs/tests, package scripts, and git status inspected.
- 2026-09-03: Selected API `4700701733` and the three documented public source
  endpoints for capture. No files changed before this approved spec.

## Decision log

- 2026-09-03: Approved a single case-level fixture set rather than bulk data.
- 2026-09-03: Preserve the two WVGES records as separate normalized evidence
  records because they represent distinct historical source rows and expose a
  source-level disagreement.
- 2026-09-03: Hardened fixture tests to compare normalized facts to raw
  publisher records, scan the XLSX for an independent no-match result, and
  validate manifest relationships. Corrected the WVGES plugging-row well
  number to preserve raw `co_num` value `3-S-245`.
