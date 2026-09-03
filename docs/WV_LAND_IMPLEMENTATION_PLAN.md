# West Virginia land implementation plan

This plan turns [the West Virginia land architecture](WV_LAND_ARCHITECTURE.md) into checkable work. It covers documentation-approved implementation only. No phase in this document is complete until the repository is inspected, the acceptance criteria pass, and the listed verification is recorded.

## Working rules

- Do not begin a later phase while an earlier contract is unclear.
- Do not change `src/core` to encode West Virginia assumptions.
- Keep the submitted private land package synthetic.
- Keep raw public-source responses immutable and hash them with SHA-256.
- Keep WVDEP and WVGES evidence independent.
- Do not call live government endpoints from deterministic tests or evaluations.
- Do not mark a phase complete from a design note alone. Verify the repository state.

## Phase 1: Define evidence and domain contracts

**Status: implemented and verified on 2026-09-03.** The contracts and JSON
serialization boundary live under `src/domains/wv-land`; source adapters,
fixtures, tools, agents, and flow work remain deferred to later phases.

### Work

Define `SourceIdentity`, `SourceSnapshot`, `SourceEvidence`, `Finding`, `Conflict`, `Unknown`, `Well`, `ProductionRecord`, and their provenance fields. Decide serialization rules for IDs, timestamps, hashes, optional dates, warnings, evidence links, and status history. Add repository and service boundaries without adding WV-specific assumptions to `src/core`.

Add tests for round-trip serialization, required fields, immutable snapshot metadata, finding evidence links, conflict preservation, unknown reasons, and rejection of malformed records.

### Acceptance criteria

- Each contract has a stable identifier and explicit timestamp fields.
- Each material `Finding` links to evidence or has an explicit `unknown` status.
- `Conflict` retains all competing claims and their evidence IDs.
- `SourceSnapshot` records request URL, retrieval time, hash, raw reference, and immutable status.
- Serialization preserves the full record without silently dropping optional values.
- `src/core` contains no WVDEP, WVGES, or West Virginia constants.

### Verification

Run the repository baseline after implementation:

```sh
node --version
npm run typecheck
npm test
npm run build
```

Inspect the diff and targeted contract tests. Record the test names and results in the approved implementation spec or result record.

### Verification record

- `node --version`: v24.14.1
- `npm run typecheck`: passed
- `node --import tsx --test tests/wv-land-contracts.test.ts`: passed
- Full `npm test`: passed
- `npm run build`: passed
- `git diff --check`: passed
- `npm run validate:records`: fails on pre-existing missing headings in specs 001–004 and results 001–004; this is unrelated to Phase 1 contracts.
- `src/core` remains free of WVDEP, WVGES, and West Virginia constants.
- Decoded metadata, normalized facts, evidence, and judgment records are
  runtime-frozen; write-once immutable raw snapshot storage remains deferred to
  the retrieval/persistence phases.
- Dataset identities and normalized well facts retain the architecture's
  value-only shapes; retrieval and production timestamps are carried by their
  linked evidence records.

## Phase 2: Capture real WV evidence fixtures

**Status: implemented and verified on 2026-09-03.** The fixture-backed case
`braxton-4700701733` contains authentic public snapshots captured from WVDEP
and WVGES, plus a synthetic submitted package. No source adapters were added.

### Work

Capture a small set of real public records from the verified WVDEP and WVGES ArcGIS layers and one WVDEP production workbook. Use a synthetic submitted package that contains clues matching the public records without copying a private person's records. Save exact raw responses, request metadata, retrieval timestamps, content types, SHA-256 hashes, and normalized expected representations.

Choose at least one ordinary matching case and one case that preserves a source disagreement or missing field. Record the retrieval date because public datasets change.

### Acceptance criteria

- Each fixture has a manifest with source identity, source record ID, request URL, retrieval timestamp, hash, raw reference, and parser version where applicable.
- Raw JSON, GeoJSON, and XLSX responses are stored as immutable fixture inputs.
- Normalized expected records are checked into the repository.
- The submitted package is clearly synthetic and contains no asserted real private lease or title package.
- Tests use fixture paths and do not require network access.

### Verification

Run:

```sh
npm run typecheck
npm test
npm run build
```

Add a fixture-integrity test that recomputes SHA-256 and fails on a changed raw file. Run the test with network access disabled if the repository supports that mode.

### Verification record

- `node --version`: v24.14.1
- `npm run typecheck`: passed
- `npm test`: passed, including `tests/wv-land-fixtures.test.ts`
- `npm run build`: passed
- `git diff --check`: passed
- Fixture-integrity tests recompute SHA-256 and byte lengths from committed
  WVDEP JSON, WVGES GeoJSON, and WVDEP XLSX bytes without network access.
- WVDEP and WVGES remain separate source identities; the fixture preserves the
  operator disagreement and does not convert the workbook's missing API row
  into zero production.
- The complete 2025 workbook is intentionally retained to make the negative
  no-match result independently verifiable. Before adding another comparably
  large workbook, review Git LFS or external immutable artifact storage to
  prevent uncontrolled repository growth.
- `npm run validate:records`: to be run after the matching result record is
  created; pre-existing records 001–004 have unrelated missing-heading
  findings.

## Phase 3: Implement deterministic WV source adapters

### Work

Implement `WvdepWellSourceAdapter` for WVDEP ArcGIS layer 7, `WvgesWellSourceAdapter` for WVGES ArcGIS layer 4, and `WvdepProductionSourceAdapter` for the annual and H6A workbook formats. Keep transport in `RetrievalProvider`. Keep field mapping, source IDs, parsing, and normalization in each `SourceAdapter`.

Add fixture-backed contract tests for API-keyed queries, pagination, GeoJSON and JSON parsing, geometry extraction, workbook headers, empty values, date fields, and reported source limits.

### Acceptance criteria

- Each adapter returns normalized source evidence with a stable source record ID.
- Each adapter preserves the exact request URL and snapshot metadata.
- WVDEP and WVGES records remain distinguishable after normalization.
- Production values retain units and reporting period.
- Malformed responses and schema changes produce typed failures or warnings, not fabricated facts.
- Contract tests pass without a live endpoint.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run targeted adapter contract tests and inspect normalized output against the checked-in expected JSON.

## Phase 4: Implement deterministic tools

### Work

Implement exact tools for API and permit normalization, name normalization, date parsing and comparison, coordinate distance with declared units and tolerance, SHA-256 hashing, production aggregation, and identifier comparison. Keep tools pure when they transform explicit inputs. Use a service only when the code owns a provider, persistence, or lifecycle.

### Acceptance criteria

- API normalization accepts known formatting variants and rejects ambiguous values.
- Name normalization is deterministic and retains the original value for evidence.
- Dates preserve source precision and never invent an effective date.
- Coordinate comparison records datum assumptions and returns a documented distance.
- Production aggregation preserves units, periods, and source evidence IDs.
- Hashing is tested against known values.
- Exact operations are not implemented in agent prompts.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run targeted unit tests for each tool, including null, malformed, boundary, and conflicting inputs.

## Phase 5: Simplify the domain and implement the flagship flow

### Work

Reduce the current land catalog according to the migration matrix in the architecture document. Replace `land-package-review` with `wv-land-well-reconciliation`. Implement only `land-case-intake`, `land-well-lease-reconciliation`, and `case-synthesizer` as agents. Convert reusable procedures to skills and exact comparison work to tools.

Keep the runtime catalog and core loader jurisdiction-neutral. Put WV-specific source identities and mapping in the domain-specific layer.

### Acceptance criteria

- The flagship flow has explicit inputs, outputs, sequencing, branches, and failure rules.
- Intake identifies missing evidence and does not infer identifiers.
- Reconciliation compares independent source evidence and emits structured findings, conflicts, and unknowns.
- Synthesis cannot mark the case complete when a required agent or evidence source failed.
- The catalog no longer presents deleted V1 agents and flows as active flagship capabilities.
- No runtime code performs title certification or consequential actions.

### Verification

```sh
npm run typecheck
npm test
npm run build
npm run eval -- wv-land-well-reconciliation
```

Run catalog and architecture tests. Inspect the generated run record and verify that the source evidence and proposed route are present.

## Phase 6: Persist structured findings and orchestrate review

### Work

Make `Finding`, `Conflict`, and `Unknown` durable records linked to a case, run, source snapshot, and producer. Integrate them with `RunService`, existing provenance and audit records, and the human-review transition. Preserve agent Markdown as a presentation field only.

### Acceptance criteria

- Findings survive persistence and reload with evidence links intact.
- Run history shows the source snapshot set used by the run.
- A human-review transition records the proposed route and reviewer decision.
- Approval does not execute a filing, payment, registry update, or communication.
- A later refresh creates a new snapshot rather than mutating old evidence.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run records, storage, API, and human-review tests. Inspect persisted JSON or database records directly and check `git diff --check`.

## Phase 7: Add fixture-backed evaluations

### Work

Add separate evaluations for raw parsing, normalization, agent judgment, flow routing, adversarial inputs, cross-case leakage, and unauthorized actions. Build cases from checked-in WV snapshots and synthetic inputs. Include expected findings, required evidence, preserved conflicts, required unknowns, expected route, and prohibited claims.

### Acceptance criteria

- No evaluation calls a live government endpoint.
- Parser and normalization evals identify source-field and unit errors.
- Agent evals require evidence-linked findings and preserve source disagreements.
- Flow evals verify missing evidence, failed-step, and human-review branches.
- Adversarial cases reject prompt injection and unauthorized actions.
- Cross-case cases prove that one case cannot use another case's data.

### Verification

```sh
npm run typecheck
npm test
npm run build
npm run eval -- wv-land-well-reconciliation
```

Record the case count and pass or fail result in the implementation result record. If the evaluator has a list command, use it to verify that the WV suite is discovered.

## Phase 8: Build the case-centered UI

### Work

Prioritize a case workspace that shows source snapshots, evidence, findings, conflicts, unknowns, run history, and the human-review state. Add a case-copilot chat pane only as an interface to the case and its evidence. Require citations or evidence links in answers.

### Acceptance criteria

- A reviewer can inspect the exact evidence behind every material finding.
- Conflicting WVDEP and WVGES facts display separately.
- The UI distinguishes a proposed route from an approved action.
- Run history exposes failed steps and snapshot IDs.
- Chat cannot silently launch an unapproved consequential action.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run the existing API and UI checks. Manually inspect one fixture-backed case in the local application.

## Phase 9: Add optional live-source mode and Microsoft integration

### Work

Add an explicit live-source mode that creates a new immutable snapshot for every refresh and reports source availability, schema changes, and retrieval failures. Keep Foundry and Microsoft provider boundaries behind existing adapters. Keep local deterministic execution independent of Azure credentials.

### Acceptance criteria

- Live refresh never mutates a previous snapshot.
- The run records the exact source URLs, timestamps, hashes, and parser versions.
- The application can run the fixture-backed demonstration without Azure credentials.
- Microsoft provider tests use fake providers and do not make cloud access mandatory.
- Source changes fail visibly or create warnings that reach human review.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run any existing Foundry and retrieval tests. Run a live refresh only as an opt-in integration check and never as part of the deterministic test or evaluation command.

## Phase approval boundary

Phase 1 is authorized and complete. Do not begin Phase 2 until it is separately
approved and Phase 1 remains a stable contract boundary.
