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

**Status: implemented and verified on 2026-09-03.** The source retrieval port,
WVDEP and WVGES ArcGIS adapters, and the captured WVDEP 2025 annual workbook
adapter are implemented under `src/domains/wv-land/adapters`. H6A is not yet
implemented or validated. Tests use only the frozen Phase 2 snapshots and
synthetic in-memory edge cases.

### Work

Implement `WvdepWellSourceAdapter` for WVDEP ArcGIS layer 7, `WvgesWellSourceAdapter` for WVGES ArcGIS layer 4, and `WvdepProductionSourceAdapter` for the captured WVDEP 2025 annual workbook format. Keep H6A deferred until an authentic fixture and parser contract exist. Keep transport in `RetrievalProvider`. Keep field mapping, source IDs, parsing, and normalization in each `SourceAdapter`.

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

**Status: implemented and verified on 2026-09-03.** Reusable pure tools for
identifiers, names, source dates, coordinates, hashing, and production
aggregation live under `src/domains/wv-land/tools`. Production aggregation is
provenance-aware and conservative: incompatible, duplicate, or overlapping
evidence is surfaced rather than silently summed. Coordinates use an explicitly
approximate spherical haversine calculation, not survey measurement. Agents, flows,
reconciliation, persistence, evaluations, and live-source orchestration remain
deferred to later phases.

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

**Status: implemented and verified on 2026-09-03.** The active catalog now
exposes the three canonical agents and flagship flow, while a topology-neutral
typed-step seam validates transient structured artifacts and propagates
required-step failures. Production agent judgment remains behind an injected
provider-neutral executor; offline Phase 5 tests use only a test-scoped stub.

### Work

Reduce the current land catalog according to the migration matrix in the architecture document. Replace `land-package-review` with `wv-land-well-reconciliation`. Implement exactly `land-case-intake`, `land-well-reconciler`, and `case-synthesizer` as the canonical agents. Keep only genuinely reusable existing skills; do not create skills merely to preserve inactive catalog entries. Exact comparison work remains in the Phase 4 tools.

Extend the jurisdiction-neutral runtime only with the smallest provider-neutral
typed execution seam needed by this flow. The seam accepts a typed flow input,
passes structured artifacts between three ordered required steps, validates
typed step outputs, records explicit step success or failure, propagates
required-step failures, and prevents successful synthesis when required
upstream execution or evidence acquisition failed. It must not become a
general workflow engine: no speculative DAGs, expression language,
parallelism, distributed execution, retries beyond an existing required
contract, or durable orchestration.

The flow input contains case identity, synthetic submitted package data,
independently normalized WVDEP/WVGES/production evidence, snapshot and
provenance references, and deterministic Phase 4 results as needed. The flow
output contains step statuses, transient structured `Finding`, `Conflict`, and
`Unknown` records, evidence/provenance references, a synthesis result, a
proposed next route, and an explicit incomplete or failed state when required.
Markdown is presentation only, never the canonical finding or flow result.

Conceptually, the artifacts passed between steps are:

```text
FlowInput {
  caseIdentity, submittedPackage,
  sourceEvidence[], sourceSnapshots[], deterministicResults[],
  evidenceAcquisition[]
}
IntakeResult {
  stepStatus, caseScope, suppliedClues[], missingEvidence[],
  ambiguousInputs[], candidateQueries[], route, provenance
}
ReconciliationResult {
  stepStatus, findings[], conflicts[], unknowns[],
  evidenceRefs[], provenance, route
}
FlowResult {
  stepStatuses[], findings[], conflicts[], unknowns[],
  evidenceRefs[], synthesis, proposedRoute, status: complete | incomplete | failed
}
```

The canonical definition paths are
`domains/land-administration/agents/land-case-intake.agent.md`,
`domains/land-administration/agents/land-well-reconciler.agent.md`,
`domains/land-administration/agents/case-synthesizer.agent.md`, and
`domains/land-administration/flows/wv-land-well-reconciliation.flow.md`.

The ordered required steps are intake, reconciliation, and synthesis. Required
evidence acquisition status is supplied before those steps; successful
acquisition with no matching evidence remains business evidence state, while
required acquisition failure is an execution failure. Intake
failure stops the flow. Reconciliation may produce legitimate unknowns or
conflicts when its execution succeeds, but a reconciliation execution or
required-evidence failure is propagated to synthesis. Synthesis always
preserves upstream artifacts; with any required failure it returns an explicit
incomplete or failed flow result and never reports successful completion.

The three agents have these exact responsibilities:

| Agent | Owns | Does not own |
| --- | --- | --- |
| `land-case-intake` | Bounded assessment of submitted material and whether clues/evidence are sufficient to proceed | Inventing identifiers, source retrieval, title or ownership judgment |
| `land-well-reconciler` | Bounded comparison judgment over independent WVDEP/WVGES/production evidence and deterministic results; structured findings, conflicts, and unknowns | Publisher precedence, title certification, legal effect, exact calculations |
| `case-synthesizer` | Case-level synthesis and one proposed next route from structured upstream artifacts | Converting failures into uncertainty, false completion, or consequential action |

Evidence acquisition is separate from judgment. Frozen fixture-backed
evidence is loaded by deterministic adapters/services before agent execution;
agents consume that context and do not retrieve or parse public sources or
redo exact normalization, hashing, date, coordinate, identifier, or
production operations. Phase 5 is offline and does not require Foundry
credentials. A provider-neutral executor may be used to exercise the same
typed contract; Microsoft-specific behavior remains deferred.

Execution failure means a required step or required evidence acquisition could
not complete and remains a failure. Business uncertainty means execution
succeeded but evidence supports an unknown, inconclusive finding, or
unresolved conflict. The synthesizer preserves both and cannot relabel one as
the other.

### Acceptance criteria

- The canonical catalog contains exactly the three flagship agents and the `wv-land-well-reconciliation` flow; inactive V1 agents and flows are not presented as active flagship capabilities.
- The canonical files and IDs are `land-case-intake`, `land-well-reconciler`, `case-synthesizer`, and `wv-land-well-reconciliation` at the documented paths.
- The flow has a documented typed input, typed output, ordered required steps, explicit step statuses, routing outcomes, and failure propagation.
- Fixture-backed normalized evidence and Phase 4 deterministic results enter the execution context before agent judgment; no agent owns source retrieval, parsing, or exact calculations.
- Intake produces a validated structured assessment that preserves missing or ambiguous clues and never invents identifiers.
- Reconciliation produces validated transient `Finding`, `Conflict`, and `Unknown` records with evidence and provenance references, while keeping WVDEP and WVGES independent.
- Synthesis receives structured upstream artifacts and cannot report successful completion when a required step or required evidence source failed.
- Business uncertainty remains distinct from execution failure; no normal unknown is fabricated from a failed source.
- The flow preserves production no-match versus reported zero, historical multiplicity, source conflicts, and public-evidence/title boundaries.
- Deterministic runtime boundaries reject title certification and consequential actions; no Phase 5 component performs them.
- Offline deterministic contract and integration tests prove topology, typed I/O, artifact propagation, failure propagation, source independence, no-match/zero semantics, and prohibited behavior.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run the targeted Phase 5 contract/integration tests, catalog and architecture
tests, and inspect a fixture-backed execution result for source evidence,
structured artifacts, failure state, and proposed route. Behavioral evaluation
is deferred to Phase 7.

### Verification record

- `node --version`: v24.14.1
- `npm run typecheck`: passed
- targeted Phase 1–5 tests: passed, including `tests/wv-land-flow.test.ts`
- `npm test`: passed, 81 tests
- `npm run build`: passed; existing Next.js package-lock tracing warning only
- `git diff --check`: passed
- `rg -n -i 'wvdep|wvges|west virginia|well|land' src/core`: no matches
- Phase 2 frozen fixture/hash tests: passed; raw snapshots unchanged
- `npm run validate:records`: expected pre-existing findings remain in
  records 001–004; the Phase 5 record pair is valid after result creation.

## Phase 6: Persist structured findings and orchestrate review

Status: implemented and verified on 2026-09-03. The WV domain now persists a
validated case/run aggregate containing the Phase 5 structured result, exact
source snapshot/evidence associations, and an append-only human review
history. Generic run history contains only jurisdiction-neutral references to
the structured result, snapshots, and review packet.

### Work

Persist the validated structured Phase 5 flow result. Make `Finding`, `Conflict`, and `Unknown` durable records linked to case, run, source snapshots, and producer. Add retrieval of prior structured results, integrate with `RunService` persistence/audit boundaries as appropriate, and implement the human-review lifecycle including approval, rejection, and revision state. Preserve agent Markdown as presentation only.

### Acceptance criteria

- Findings survive persistence and reload with evidence links intact.
- Phase 6 consumes the Phase 5 structured result contracts rather than introducing a second output model.
- Run history shows the source snapshot set used by the run.
- Prior structured findings, conflicts, and unknowns can be retrieved with their provenance intact.
- A human-review transition records the proposed route and reviewer approval, rejection, or revision decision.
- Approval does not execute a filing, payment, registry update, or communication.
- A later refresh creates a new snapshot rather than mutating old evidence.

### Verification

```sh
npm run typecheck
npm test
npm run build
```

Run records, storage, API, and human-review tests. Inspect persisted JSON or database records directly and check `git diff --check`.

### Verification record

- node --version: v24.14.1
- targeted Phase 1–6 tests: passed, 38 tests
- npm test: passed, 94 tests
- npm run typecheck: passed
- npm run build: passed; existing Next.js package-lock tracing warning only
- git diff --check: passed
- frozen Phase 2 fixture/hash tests: passed
- The core leakage check found only generic Finding, Conflict, Unknown, and
  action-port vocabulary; no West Virginia or land-specific vocabulary.
- Persistence tests verify aggregate reload, provenance and snapshot
  associations, historical runs, fail-closed integrity checks, failure versus
  uncertainty, review transitions, append-only decisions, revision lineage,
  generic run-history synchronization, publication failure recovery, and
  JSON-safe prepublication validation.
- npm run validate:records passes for the Phase 6 spec/result pair; legacy
  records 001–004 retain their pre-existing missing-section findings.

## Phase 7: Add fixture-backed evaluations

**Status: implemented and verified on 2026-09-04.** The WV evaluation path
loads the immutable Phase 2 fixture, exercises the Phase 3 adapters and Phase
4 typed expectations, validates structured Phase 5 artifacts, and evaluates
the typed flagship flow through the existing provider-neutral executor seam.
Local deterministic and harness checks run without credentials; behavioral
measurement additionally requires an explicit external executor capability
descriptor, so the local environment reports behavioral measurements as not
collected rather than inferring them from predefined outputs.

### Work

Build a behavioral evaluation harness around the validated structured Phase 5 execution model. Add separate fixture-backed evaluations for raw parsing, normalization, agent judgment, flow routing, adversarial inputs, cross-case leakage, and unauthorized actions. Build cases from checked-in WV snapshots and synthetic inputs. Include expected findings, required evidence, preserved conflicts, required unknowns, expected route, and prohibited claims. Do not use brittle exact prose comparisons.

### Acceptance criteria

- No evaluation calls a live government endpoint.
- Parser and normalization evals identify source-field and unit errors.
- Agent evals require structured evidence-linked findings and preserve source disagreements.
- Flow evals verify missing evidence, failed-step, and human-review branches.
- Adversarial cases reject prompt injection and unauthorized actions.
- Cross-case cases prove that one case cannot use another case's data.
- Evaluations distinguish execution failure from successful business uncertainty.

### Verification

```sh
npm run typecheck
npm test
npm run build
npm run eval -- wv-land-well-reconciliation
```

Record the case count and pass or fail result in the implementation result record. If the evaluator has a list command, use it to verify that the WV suite is discovered.

### Verification record

- `node --version`: v24.14.1
- `npm run typecheck`: passed
- targeted `tests/wv-land-evaluations.test.ts`: passed, 15 tests
- `npm test`: passed, 109 tests
- `npm run build`: passed; existing Next.js tracing warning only
- `npx tsx scripts/run-evals.ts wv-land-well-reconciliation`: passed; 14 cases,
  7 deterministic/harness passes, 0 deterministic/harness failures, and 7
  behavioral cases not collected because no genuine executor was supplied
- frozen fixture/hash verification: passed
- `git diff --check`: passed
- no evaluation or deterministic test required a live WV government endpoint

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
