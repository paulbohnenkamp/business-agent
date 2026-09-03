# West Virginia land architecture

This document is the architecture specification for the West Virginia oil-and-gas flagship built on the reusable `business-agent` runtime. It records the source boundaries, domain contracts, workflow, migration decisions, and implementation shape that future code changes must follow.

## Purpose and scope

The flagship demonstrates an evidence-bounded land workflow for one submitted land or lease case. It identifies relevant West Virginia wells, collects public regulatory and geological evidence, reconciles the submitted package with that evidence, records structured findings, and routes unresolved or consequential decisions to a human land reviewer.

The application combines real public WVDEP and WVGES evidence with a synthetic submitted private land package. The package is test input created for this project. It does not represent a real person's lease, title, ownership, or financial records.

The portfolio objective is to turn `business-agent` into a credible case-centered land workbench while keeping its runtime reusable for other jurisdictions and domains. West Virginia belongs in the flagship domain and source adapters. It must not leak into `src/core` contracts or provider-neutral orchestration.

## Non-goals and authority limits

The workflow does not establish mineral title, county-record ownership, legal effect, recording priority, payment entitlement, or a division order. WVDEP and WVGES records provide public well, permit, location, formation, operator, lease-related, and production evidence. They are not county deed indexes, title opinions, or proof of ownership.

The system must label an unsupported conclusion as `unknown`, preserve a disagreement as a `conflict`, and request human review when evidence is incomplete or a decision could cause a consequential action. It must not infer a lease interest from a public well record or treat a `mineral` or `lease` field as a title determination.

## Flagship workflow

The flow ID is `wv-land-well-reconciliation`.

### Inputs

- A synthetic submitted land package with a tract or lease description and any well, permit, API, farm, operator, or location clues.
- Optional supplied private records represented as synthetic case data.
- A case ID and source-snapshot policy.

### Execution

1. `land-case-intake` identifies the case scope, normalizes supplied identifiers, records the submitted facts, and lists evidence queries and missing inputs.
2. Deterministic source services query or load WVDEP well, WVGES well, and relevant WVDEP production records. They save immutable raw snapshots and return normalized evidence.
3. `land-well-lease-reconciliation` compares the submitted package with the independent public evidence. It produces findings about well identity, operator, farm or lease names, lease numbers, location, formation, status, completion, and production. It preserves conflicts and does not certify title.
4. `case-synthesizer` consolidates findings, evidence, conflicts, unknowns, and failures. It proposes one next route and explains what a human must decide.
5. Human review accepts, changes, rejects, or returns the proposed reconciliation. The run remains a review record. It does not file, update a registry, change payment data, or contact an owner.

Source retrieval is a deterministic operation, not an agent. Identifier normalization, parsing, coordinate distance, date handling, hashing, arithmetic, and production aggregation are deterministic TypeScript operations, not agent judgments.

### Initial agent topology

| Agent | Bounded judgment | Must not do |
| --- | --- | --- |
| `land-case-intake` | Decide case scope, extract supplied clues, and identify missing evidence or candidate queries | Query sources by inventing identifiers or decide ownership |
| `land-well-lease-reconciliation` | Compare supplied claims with independent normalized evidence and classify matches, conflicts, and unknowns | Certify title, resolve legal effect, or collapse source disagreement |
| `case-synthesizer` | Explain the evidence-bounded result and propose a human route | Execute a filing, payment change, registry update, or owner communication |

There is no separate agent for every business role. A role becomes an agent only when it owns a bounded evidence-based judgment. Reusable comparison and evidence procedures belong in skills. Exact operations belong in tools and services.

## Verified public sources

The following sources were verified on September 3, 2026. Source URLs are recorded in evidence and snapshots at retrieval time because government services can change their fields, limits, and availability.

### WVDEP enterprise oil-and-gas ArcGIS service

WVDEP publishes its public ArcGIS REST directory at [`https://tagis.dep.wv.gov/arcgis/rest/services`](https://tagis.dep.wv.gov/arcgis/rest/services). The oil-and-gas service is:

`https://tagis.dep.wv.gov/arcgis/rest/services/WVDEP_enterprise/oil_gas/MapServer`

The initial well adapter uses layer 7, `All DEP Wells`:

`https://tagis.dep.wv.gov/arcgis/rest/services/WVDEP_enterprise/oil_gas/MapServer/7/query`

The adapter sends ArcGIS REST query parameters such as `where`, `outFields=*`, `returnGeometry=true`, `f=geojson`, `resultOffset`, and `resultRecordCount`. It queries by canonical API or permit ID when available and uses pagination for broader searches. It records the request URL and response body in the snapshot. The layer metadata reports a 3,000-record request limit.

Useful fields include `api`, `permitid`, `permit`, `county`, `welltype`, `welluse`, `welldepth`, `permittype`, `issuedate`, `compdate`, `respparty`, `wellstatus`, `farmname`, `wellnumber`, `recdate`, `marcellus`, `formation`, `wellx`, and `welly`. WVDEP describes the oil-and-gas data as information reported to the Office of Oil and Gas by operators and does not guarantee accuracy, precision, or completeness. See the [WVDEP Data Center](https://dep.wv.gov/Data/Pages/default.aspx), the [WVDEP GIS data page](https://dep.wv.gov/oil-and-gas/databaseinfo/Pages/GIS-Data-Download-and-Information-Link.aspx), and the [WVDEP database information page](https://dep.wv.gov/oil-and-gas/databaseinfo/Pages/default.aspx).

This is the primary source for WV regulatory well identity, permit, status, and reported regulatory attributes.

### WVGES OilGas_WVOG ArcGIS service

WVGES publishes the OilGas_WVOG REST service at [`https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer`](https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer). The initial well adapter uses layer 4, `All Individual Oil and Gas Wells`:

`https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer/4/query`

The adapter uses `where=api = <canonical API>`, `outFields=*`, `returnGeometry=true`, `f=geojson`, and pagination. The service supports JSON, GeoJSON, and PBF and reports a 2,000-record maximum response. The layer is keyed by API number.

Useful fields include `api`, `countyname`, `permit`, `lat_dd`, `lon_dd`, `statustr`, `cmpyr`, `surf_own`, `mineral`, `lease`, `leasenum`, `opernm`, `prdopernm`, `fieldnm`, `dfmnm`, `welltypetr`, `td`, and `md`. The [WVGES OilGas_WVOG service description](https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer) states that the data includes locations, completions, farm and operator data, formations, production, plugging, and selected log and sample references.

This is a separate geological and historical evidence source. It is useful for corroboration and for fields that WVDEP does not expose in the same form. The application never overwrites WVDEP facts with WVGES facts during ingestion.

### WVDEP production workbooks

WVDEP publishes annual oil-and-gas production workbooks from its [database information page](https://dep.wv.gov/oil-and-gas/databaseinfo/Pages/default.aspx). The page describes annual reporting and provides the workbook links. It also provides quarterly H6A horizontal-production files. Phase 3 supports only the captured 2025 annual workbook. The adapter retrieves the raw XLSX through the retrieval boundary, hashes it, parses its fixed XML layout with a versioned parser, and emits normalized `ProductionRecord` values. H6A is not implemented or validated and requires an authentic fixture before support is claimed.

For example, the page currently links the 2025 workbook at `https://apps.dep.wv.gov/Documents/OOG/ProductionReports/2020-2029/2025Production.xlsx`. The adapter must treat the page as the discovery source and the workbook URL as the exact retrieval URL recorded in the snapshot. It must not assume that future year paths or filenames will remain unchanged.

The source reports gas in MCF and oil, condensate, and water in barrels. The initial production adapter uses an explicit year or snapshot manifest. It does not scrape the public HTML search tool.

### WVGES workbook downloads

WVGES also publishes downloadable workbooks, including [Marcellus well data](https://www.wvgs.wvnet.edu/www/datastat/devshales.htm). These files can provide bulk fixtures and a secondary check of the ArcGIS service. They are not required for the first case-level query path. WVGES Pipeline and scanned-record repositories remain human reference links in V1. They are not scraped by the application.

## Evidence architecture

The evidence model has three levels. `SourceIdentity` describes a dataset. `SourceSnapshot` describes one immutable retrieval. `SourceEvidence` describes one normalized record linked to that snapshot.

### `SourceIdentity`

```ts
type SourceIdentity = {
	id: string;
	publisher: string;
	dataset: string;
	mechanism: "arcgis-rest" | "xlsx-download";
	datasetVersion?: string;
	authorityScope: string;
};
```

Examples include `wvdep-oog-rbdms-wells`, `wvges-oilgas-wells`, and `wvdep-annual-production`.

### `SourceSnapshot`

```ts
type SourceSnapshot = {
	snapshotId: string;
	source: SourceIdentity;
	requestUrl: string;
	retrievedAt: string;
	effectiveDate?: string;
	publicationDate?: string;
	contentType: string;
	contentHash: string;
	rawSnapshotRef: string;
	byteLength: number;
	parserVersion?: string;
	immutable: true;
};
```

The raw response is written once. The SHA-256 hash covers the exact bytes stored at `rawSnapshotRef`. A later refresh creates a new snapshot, even when the normalized facts do not change. Retrieval failures are recorded with the request and error metadata and never converted into an empty successful snapshot.

### `SourceEvidence`

```ts
type SourceEvidence<TFacts> = {
	evidenceId: string;
	snapshotId: string;
	source: SourceIdentity;
	sourceRecordId: string;
	sourceUrl: string;
	retrievedAt: string;
	effectiveDate?: string;
	publicationDate?: string;
	contentHash: string;
	rawSnapshotRef: string;
	normalizedFacts: TFacts;
	warnings: string[];
};
```

The source record ID uses the publisher's stable identifier when one exists. For well records it is the canonical API number or the API and permit pair. For a production row it is a stable composite such as `{reportYear}:{apiNumber}` plus any operator or row discriminator required by the workbook. `sourceUrl` points to the exact query or download used to obtain the record.

### Domain records

```ts
type Finding = {
	findingId: string;
	caseId: string;
	subject: string;
	assertion: string;
	status: "supported" | "contradicted" | "inconclusive" | "unknown";
	confidence: "high" | "medium" | "low" | "unknown";
	evidenceIds: string[];
	conflictIds: string[];
	unknownIds: string[];
	provenance: Provenance;
	producer: string;
	producedAt: string;
};

type Conflict = {
	conflictId: string;
	subject: string;
	claims: Array<{ value: unknown; evidenceIds: string[] }>;
	reason: string;
	status: "unresolved" | "resolved-by-review";
	createdAt: string;
};

type Unknown = {
	unknownId: string;
	subject: string;
	question: string;
	reason: string;
	neededEvidence?: string[];
	createdAt: string;
};

type Well = {
	apiNumber: string;
	permitId?: string;
	county?: string;
	surfaceLocation?: { latitude: number; longitude: number; datum?: string };
	wellNumber?: string;
	sourceRecordType?: string;
	farmOrLeaseName?: string;
	leaseNumber?: string;
	operator?: string;
	operatorAtCompletion?: string;
	status?: string;
	wellType?: string;
	formation?: string;
	measuredDepth?: number;
	trueVerticalDepth?: number;
	issuedDate?: string;
	completedDate?: string;
	productionEvidenceIds: string[];
	evidenceIds: string[];
};

type ProductionRecord = {
	productionRecordId: string;
	apiNumber: string;
	period: { year: number; month?: number };
	gasMcf?: number;
	oilBarrels?: number;
	condensateBarrels?: number;
	waterBarrels?: number;
	operator?: string;
	evidenceId: string;
};
```

`Provenance` records the run ID, step ID, input record IDs, source evidence IDs, and producer version. Persistence must serialize the records without losing IDs, timestamps, evidence links, or conflict and unknown status. Markdown agent output may explain a finding, but the structured `Finding` is the business record used by the UI, evaluator, audit trail, and review service.

## Source adapters and retrieval providers

`RetrievalProvider` owns transport and snapshot mechanics. It can fetch an HTTPS URL, enforce timeouts and response-size limits, capture bytes, compute SHA-256, and persist an immutable `SourceSnapshot`.

`SourceAdapter` owns a dataset's request construction, response parsing, field mapping, identifier rules, date rules, and normalized fact contract. It calls a `RetrievalProvider` and returns `SourceEvidence` or a typed retrieval or parse failure. An adapter must not own agent judgment, workflow routing, title interpretation, or human approval.

In the current repository, the existing core `RetrievalProvider` is the
document-search port. Phase 3 therefore adds a separate byte-oriented
`SourceRetrievalProvider` under `src/retrieval`; it is the retrieval boundary
used by source adapters and does not alter document search semantics.

The first adapters are:

| Adapter | Retrieval | Output |
| --- | --- | --- |
| `WvdepWellSourceAdapter` | WVDEP ArcGIS layer 7 query | `Well` evidence with regulatory fields and geometry |
| `WvgesWellSourceAdapter` | WVGES ArcGIS layer 4 query | `Well` evidence with geological, lease-related, operator, and geometry fields |
| `WvdepProductionSourceAdapter` | Captured WVDEP annual XLSX download | `ProductionRecord` evidence |

The normalized model keeps source-specific fields in source evidence and maps only stable shared facts into `Well` and `ProductionRecord`. The adapters retain warnings for nulls, ambiguous dates, coordinate datum differences, workbook schema changes, and non-canonical identifiers.

## Agent, skill, flow, and tool boundaries

Agents own bounded evidence-based judgments. Skills own reusable procedures. Flows own sequencing and branching. Deterministic TypeScript services and tools own source access, parsing, normalization, identifiers, arithmetic, hashing, dates, and other exact operations.

Examples of skills are evidence comparison, source disagreement analysis, lease-name comparison, and provenance validation. Examples of deterministic tools are API-number normalization, name normalization, coordinate-distance calculation, date parsing, production aggregation, content hashing, and identifier comparison. No model call may be required to obtain or normalize public evidence.

The reusable runtime remains jurisdiction-neutral. WV-specific source identities, adapters, field mappings, fixtures, and agents live under the flagship domain or a domain-specific integration package. `src/core` keeps generic contracts and ports.

## Migration matrix

The current land catalog has 11 agents, 9 skills, and 5 flows. The following decisions cover every current catalog artifact relevant to the flagship.

### Agents

| Existing artifact | Decision | Target |
| --- | --- | --- |
| `intake-reviewer` | replace | `land-case-intake` with explicit identifier and evidence-query output |
| `land-package-triage` | merge | Intake routing rules become a skill used by `land-case-intake` |
| `lease-obligation-reviewer` | convert-to-skill | Lease obligation extraction remains reusable but is outside V1 |
| `lease-lifecycle-reviewer` | convert-to-skill | Lifecycle procedure is retained for a later lease workflow |
| `title-chain-reviewer` | delete | Public WV well evidence cannot perform title-chain review |
| `assignment-transfer-reviewer` | convert-to-skill | Assignment comparison remains optional package analysis |
| `ownership-reviewer` | delete | Replace title-like ownership assessment with explicit unknowns and human review |
| `interest-reconciliation-reviewer` | convert-to-deterministic-tool | Exact interest arithmetic and comparison belong in TypeScript; legal interpretation remains human work |
| `division-order-preparer` | delete | Payment preparation is outside the flagship |
| `compliance-reviewer` | delete | No jurisdictional compliance review is in the initial workflow |
| `case-synthesizer` | keep | Refine it to emit structured findings and one proposed human route |
| new `land-well-lease-reconciliation` | replace | New bounded comparison judgment for the flagship |

### Skills

| Existing artifact | Decision | Target |
| --- | --- | --- |
| `land-package-triage` | merge | Merge into intake routing |
| `lease-obligation-analysis` | convert-to-skill | Retain for a later lease workflow |
| `lease-lifecycle-review` | convert-to-skill | Retain for a later lease workflow |
| `title-chain-review` | delete | Not supported by the public-source scope |
| `ownership-interest-reconciliation` | convert-to-deterministic-tool | Move arithmetic and identifier comparison to tools; keep evidence-review procedure where useful |
| `ownership-verification` | convert-to-skill | General evidence comparison procedure, renamed for well and lease evidence |
| `parcel-record-analysis` | delete | Generic parcel-transfer scope is not the flagship |
| `division-order-preparation` | delete | Payment preparation is out of scope |
| `assignment-transfer-review` | convert-to-skill | Optional future package analysis |

### Flows

| Existing artifact | Decision | Target |
| --- | --- | --- |
| `parcel-transfer-review` | delete | Generic parcel transfer is not the flagship |
| `land-package-review` | replace | Replace with `wv-land-well-reconciliation` |
| `lease-lifecycle-review` | merge | Retain its lifecycle sequence for a later lease flow |
| `division-order-preparation` | delete | Payment and division-order issuance are out of scope |
| `assignment-transfer-review` | delete | Keep assignment comparison as a future skill, not a V1 flow |

### Evaluations

| Existing artifact | Decision | Target |
| --- | --- | --- |
| `evaluations/adversarial-land-admin.jsonl` | merge | Preserve prompt-injection, unauthorized-action, and cross-case cases in the WV suite |
| `evaluations/land-admin-cases.jsonl` | replace | Replace with snapshot-backed WV reconciliation cases |
| `evaluations/land-administration.jsonl` | merge | Merge useful missing and conflict cases into the principal suite, then delete the redundant file |

### Synthetic examples and fixtures

| Existing artifact or group | Decision | Target |
| --- | --- | --- |
| `examples/inputs/parcel-transfer.md` | replace | Synthetic submitted WV land package input |
| `examples/land-records/case-assignment.md` | delete | Assignment is not a V1 flow |
| `examples/land-records/case-division-order.md` | delete | Division-order preparation is not a V1 flow |
| `examples/land-records/case-lease-lifecycle.md` | replace | Synthetic submitted package with lease and well clues |
| `examples/land-records/division-order-DO-77.json` | delete | Payment preparation is out of scope |
| `examples/land-records/lease-L-2001.json` | replace | Clearly synthetic submitted lease/package record |
| `examples/land-records/obligations-L-2001.json` | merge | Include only when the synthetic package needs an obligation |
| remaining synthetic owner, tract, and unit records | replace | Snapshot-linked normalized records for the flagship case |
| new raw and normalized WV source fixtures | keep as new | Capture real public responses with manifests and hashes |

## Fixture-backed evaluation architecture

Evaluations never depend on live government endpoints. Each fixture case contains a synthetic input package, raw public responses, a manifest, normalized expected records, expected findings, and the expected human route.

```text
fixtures/wv-land/<case-id>/
  manifest.json
  input/submitted-land-package.json
  raw/wvdep-well.json
  raw/wvges-well.geojson
  raw/wvdep-production.xlsx
  normalized/wvdep-well.json
  normalized/wvges-well.json
  normalized/production.json
  expected/findings.json
  expected/review.json
```

The manifest records source identity, request URL, source record ID, retrieval time, effective or publication date, SHA-256, raw snapshot reference, parser version, and fixture version. Adapter contract tests use raw snapshots. Parser and normalization tests compare normalized records. Agent tests consume normalized evidence. Flow tests verify sequencing, branches, failure preservation, human review, and no unauthorized actions.

### Phase 2 fixture currently checked in

`fixtures/wv-land/braxton-4700701733/` is a historical, offline fixture set
captured on September 3, 2026. Its raw files are the exact WVDEP layer-7
GeoJSON response for API `4700701733`, the exact WVGES layer-4 GeoJSON
response for that API, and the exact WVDEP `2025Production.xlsx` download.
The normalized JSON links each expected record back to its source snapshot;
the workbook expectation is explicitly a `no-match` result: the selected API
has no row, which is different from reported zero production. The complete
workbook is intentionally retained because it is the authentic source needed
to verify that negative result. Before adding another comparably large
production workbook, review repository storage strategy, including Git LFS or
external immutable artifact storage, to avoid uncontrolled repository growth.
The submitted package in `input/` is
synthetic and contains only matching clues; it is not a private lease or title
package.

Fixture tests recompute SHA-256 and byte length from the committed raw bytes,
then validate normalized well evidence through the Phase 1 codecs. Tests use
the frozen historical files and never refresh them or call government
endpoints. A future live refresh is a new retrieval with a new snapshot ID,
timestamp, raw file, and hash; it must not mutate this historical fixture.

The suite must cover parser errors, null and changed fields, identifier variants, coordinate tolerances, source disagreement, missing evidence, prompt injection in submitted text, cross-case leakage, and requests to file, pay, update, or communicate without approval.

## Human review boundaries

The runtime may recommend a route and save a review packet. A human must approve before any consequential action, including filing, registry update, payment setup or change, owner communication, marking an obligation satisfied or waived, or making a legal or title determination. The approval record stores the reviewer, decision, time, reason, and the exact run and evidence snapshot reviewed.

## Target directory structure

```text
business-agent/
  docs/
    WV_LAND_ARCHITECTURE.md
    WV_LAND_IMPLEMENTATION_PLAN.md
  domains/
    land-administration/
      agents/
      flows/
      skills/
  src/
    core/                         # jurisdiction-neutral runtime and ports
    retrieval/                    # retrieval provider implementations
    domains/wv-land/              # WV mapping and source-facing services
      adapters/
      tools/
      normalization/
  fixtures/
    wv-land/
      <case-id>/
        raw/
        normalized/
        expected/
  evaluations/
    wv-land.jsonl
```

The exact directory names may follow existing repository conventions, but the ownership boundaries must remain the same.

## Phased implementation strategy

1. Define and test evidence and finding contracts.
2. Capture a small set of real public WV records and create immutable fixtures.
3. Implement fixture-backed WVDEP and WVGES adapters and the WVDEP production parser.
4. Implement exact normalization, identifier, date, coordinate, hashing, and aggregation tools.
5. Simplify the land catalog and implement the three-agent flagship flow.
6. Persist structured findings and integrate them with `RunService`, provenance, and human review.
7. Add fixture-backed parser, normalization, agent, flow, adversarial, leakage, and unauthorized-action evaluations.
8. Build a case-centered UI for evidence, findings, conflicts, run history, and review. Make chat a secondary case-copilot view.
9. Add optional live-source refresh and Microsoft provider integration. Every refresh creates a new snapshot, and local deterministic execution remains credential-free.

## Architectural decisions

- `business-agent` remains the reusable runtime and West Virginia is its flagship application domain.
- The first workflow is `wv-land-well-reconciliation`.
- The first topology has three agents: intake, reconciliation, and synthesis.
- WVDEP and WVGES remain independent sources. Ingestion never silently resolves disagreement.
- Public evidence is provenance-bearing input, not a title opinion.
- `Finding` is structured business state. Markdown is presentation.
- Raw responses are immutable and identified by SHA-256.
- Retrieval providers fetch and snapshot. Source adapters parse and normalize.
- Exact work belongs in deterministic TypeScript. Agents make bounded judgments.
- Human approval is required before consequential actions.
- Deterministic tests and evaluations use snapshots and do not call live government endpoints.

## Intentionally deferred work

- County deed, recorder, title-chain, and mineral-title integration.
- Legal conclusions, title certification, and ownership certification.
- Payment setup, division-order issuance, filing, registry updates, and owner communication.
- Full OCR or scanned-record ingestion.
- Broad parcel-transfer, assignment, compliance, and lease-lifecycle workflows.
- Live-source dependence in local tests.
- Azure credentials as a requirement for the local deterministic demonstration.
- A large agent catalog based only on job titles.
