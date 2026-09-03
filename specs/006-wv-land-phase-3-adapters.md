---
id: 006-wv-land-phase-3-adapters
title: West Virginia land Phase 3 source adapters
status: completed
created: 2026-09-03
updated: 2026-09-03
result: results/006-wv-land-phase-3-adapters.md
---

## Goal

Implement deterministic WVDEP and WVGES well source adapters and the WVDEP
2025 annual production workbook adapter against the Phase 2 evidence model.
Transport and snapshot mechanics remain behind an injected retrieval provider;
adapters own source-specific requests, parsing, mapping, identifiers, and
warnings.

## Non-goals

This slice does not implement reconciliation judgments, agents, flows, tools,
title or ownership conclusions, persistence integration, UI, live orchestration,
or production analytics. The frozen Phase 2 raw files must not be changed.

## Current-state findings

- Phase 1 provides immutable WV source, evidence, well, and production
  contracts, but no source adapters.
- Phase 2 provides exact WVDEP JSON, WVGES GeoJSON, and WVDEP XLSX snapshots,
  including three WVDEP rows, two WVGES rows, and a production no-match.
- The existing core `RetrievalProvider` is a text-search port, so byte-level
  source retrieval is added as a separate reusable retrieval boundary.

## Chosen approach

- `SourceRetrievalProvider` owns byte transport and snapshot metadata.
- `SourceAdapter<TFacts>` owns source request construction, parsing, mapping,
  source IDs, and normalized evidence.
- ArcGIS adapters preserve every feature and use GeoJSON point geometry only;
  projected WVDEP `wellx`/`welly` values are not converted.
- WVGES lease, mineral, and surface-owner fields remain publisher evidence and
  do not become title assertions. Lease name/number map only to the existing
  source-reported well fields.
- Production support is deliberately limited to the captured annual workbook;
  H6A requires a future authentic fixture and validation. No general XLSX
  parser is claimed.
- Production no-match returns no evidence. Reported numeric zero remains zero,
  while blank values remain absent.

## Affected files or modules

- `src/retrieval/source.ts`
- `src/domains/wv-land/adapters/source-adapter.ts`
- `src/domains/wv-land/adapters/arcgis.ts`
- `src/domains/wv-land/adapters/production.ts`
- `src/domains/wv-land/contracts.ts`
- `src/domains/wv-land/fact-codec.ts`
- `src/domains/wv-land/index.ts`
- `tests/wv-land-adapters.test.ts`
- `tests/source-retrieval.test.ts`
- `tests/wv-land-fixtures.test.ts`
- `fixtures/wv-land/braxton-4700701733/normalized/wvges-well.json`
- `docs/WV_LAND_IMPLEMENTATION_PLAN.md`
- matching result record

## Alternatives considered

- Reusing the existing text-search retrieval port was rejected because it
  cannot preserve source bytes and snapshot metadata.
- One WV-specific fetch-and-parse god service was rejected because it would
  collapse transport and source knowledge and make independent adapters hard
  to test.
- A third-party workbook dependency was deferred because the captured XLSX can
  be parsed through its stable XML parts without changing runtime dependencies.

## Milestones

1. Add the byte retrieval provider contract and implementations.
2. Implement ArcGIS well adapters with independent mappings and pagination.
3. Implement the captured annual workbook parser and no-match semantics.
4. Add frozen-fixture and synthetic edge-case tests, update records, and verify.

## Acceptance criteria

- Both well adapters return provenance-bearing evidence with stable publisher
  record IDs, pagination, field mapping, date handling, empty-value handling,
  and geometry extraction.
- Annual production parsing supports the captured workbook layout, retains
  units and periods, and preserves no-match versus reported-zero semantics.
- Malformed responses and invalid fields produce typed failures or warnings.
- Tests use frozen Phase 2 bytes and synthetic edge cases only; no network is
  required.

## Verification commands

```sh
node --version
npm run typecheck
node --import tsx --test tests/wv-land-adapters.test.ts
npm test
npm run build
git diff --check
npm run validate:records
```

## Risks and open questions

- The XLSX reader currently relies on the system `unzip` executable; a future
  cross-platform runtime may replace it with an injected ZIP implementation.
- Live HTTP retrieval creates in-memory snapshot references; write-once raw
  persistence remains deferred to the persistence phase.

## Progress log

- 2026-09-03: Inspected the clean repository, Phase 1 contracts, Phase 2
  fixtures, retrieval seams, and committed Phase 3 scope.
- 2026-09-03: Added retrieval boundary and WVDEP/WVGES/production adapters.
- 2026-09-03: Added fixture-backed and synthetic adapter tests; targeted tests
  pass.
- 2026-09-03: Repaired WVGES field preservation and query validation, narrowed
  production to the captured annual workbook, hardened retrieval/XLSX handling,
  and expanded offline coverage.
- 2026-09-03: Full verification passed; legacy record-validator findings are
  limited to records 001–004.

## Decision log

- 2026-09-03: Kept byte retrieval separate from the existing document-search
  `RetrievalProvider` to avoid changing unrelated runtime semantics.
- 2026-09-03: Kept WVDEP and WVGES adapters independent and did not reconcile
  operators or historical rows.
- 2026-09-03: Used temporary extraction space for XLSX XML parts; this is
  parsing scratch space, not raw evidence persistence.
- 2026-09-03: Retained WVGES `permit` as the publisher-provided component and
  did not synthesize a county-prefixed permit ID.
- 2026-09-03: Limited production support to the captured annual workbook;
  H6A remains unimplemented pending an authentic fixture.
