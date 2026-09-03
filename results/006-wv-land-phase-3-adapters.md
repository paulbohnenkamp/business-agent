---
id: 006-wv-land-phase-3-adapters
title: West Virginia land Phase 3 source adapters
status: completed
completed: 2026-09-03
spec: specs/006-wv-land-phase-3-adapters.md
---

## What changed

Implemented the deterministic source-adapter slice for the WV flagship. A
byte-oriented `SourceRetrievalProvider` now owns source transport and snapshot
metadata, while `SourceAdapter` implementations own source-specific request
construction, parsing, field mapping, identifiers, and warnings.

`WvdepWellSourceAdapter` handles WVDEP ArcGIS layer 7; `WvgesWellSourceAdapter`
handles WVGES ArcGIS layer 4; and `WvdepProductionSourceAdapter` handles annual
annual workbook rows. H6A is not implemented or validated. The XLSX reader
extracts only the required XML parts for the captured annual layout without
claiming to be a general Excel parser or mutating raw evidence.

## Files changed

- `src/retrieval/source.ts`
- `src/domains/wv-land/adapters/source-adapter.ts`
- `src/domains/wv-land/adapters/arcgis.ts`
- `src/domains/wv-land/adapters/production.ts`
- `src/domains/wv-land/contracts.ts`
- `src/domains/wv-land/fact-codec.ts`
- `src/domains/wv-land/index.ts`
- `tests/wv-land-adapters.test.ts`
- `tests/source-retrieval.test.ts`
- `fixtures/wv-land/braxton-4700701733/normalized/wvges-well.json`
- `specs/006-wv-land-phase-3-adapters.md`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`

The Phase 2 raw fixtures were not changed. The existing Phase 2 fixture test
remains unchanged and continues to validate its normalized expectations.

## Checks run and results

- `node --version` — v24.14.1
- `npm run typecheck` — passed
- targeted Phase 1, Phase 2, Phase 3, and retrieval tests — passed, 30 tests
- `npm test` — passed, 62 tests
- `npm run build` — passed; existing Next.js package-lock tracing warning only
- `git diff --check` — passed
- `rg -n -i 'wvdep|wvges|west virginia' src/core` — no matches
- `npm run validate:records` — legacy missing-heading findings remain in
  records 001–004; Phase 3 records are valid after this result was added.

## Deviations from the spec

- The repository’s existing document-search `RetrievalProvider` was not
  changed. Phase 3 adds a separate byte retrieval port because the existing
  contract cannot represent source bytes or immutable snapshot metadata.
- WVDEP GeoJSON point geometry is normalized, while projected `wellx`/`welly`
  values are deliberately not converted.

## Important decisions

- WVDEP and WVGES evidence remains independent, including all three WVDEP
  records, both WVGES records, distinct publisher IDs, and operator conflict.
- WVGES lease, mineral, and surface-owner fields remain publisher evidence;
  they are not title assertions.
- A production no-match returns no evidence. Reported zero and blank workbook
  values remain distinguishable.
- Malformed source schemas fail with typed adapter errors; malformed optional
  numeric/date values become explicit warnings rather than fabricated facts.

## Remaining follow-ups

- Phase 4 deterministic identifier, date, coordinate, hashing, and production
  aggregation tools.
- H6A support is not implemented or validated and requires an authentic
  fixture and a separate parser contract.
- Later reconciliation, agents, flows, persistence, evaluations, UI, and
  opt-in live-source orchestration remain deferred.
- Consider replacing the system `unzip` dependency with an injected
  cross-platform ZIP implementation if deployment environments require it.

## Acceptance status

All Phase 3 implementation and verification criteria are satisfied. Commit
recommendation: YES after review; no commit was created.
