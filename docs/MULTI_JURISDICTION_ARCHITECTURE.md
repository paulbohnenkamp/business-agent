# Multi-jurisdiction architecture

**Phase 7.5 migration baseline — implemented and verified**

This document is the authority for the boundary between the reusable Business
Agent runtime, shared evidence and review mechanics, shared land
administration, and jurisdiction/source implementations. The West Virginia
(WV) workflow remains the flagship implementation. It is evidence for the
architecture, not the architecture itself.

## Motivation and decision

Phase 1–7 produced a credible offline WV well-reconciliation slice, but it also
left most of the evidence model, land contracts, persistence boundary, flow
types, codecs, and evaluation suite under `src/domains/wv-land`. That placement
is safe for WV isolation but hides three different responsibilities:

1. generic runtime and evaluation mechanics;
2. evidence, provenance, judgment, and human-review concepts that can be
   useful outside land administration; and
3. land concepts that can be shared by WV, Ohio (OH), and Pennsylvania (PA).

The smallest demonstrated architecture is therefore a layered land
application, not a 50-state framework:

```text
Business Agent
├── core/runtime and infrastructure
├── shared evidence, judgment, evaluation, and review mechanics
└── land administration
    ├── shared case, well, production, and reconciliation semantics
    └── jurisdictions
        ├── WV
        │   ├── WVDEP
        │   └── WVGES
        ├── OH
        │   └── ODNR
        └── PA
            └── PA DEP / PASDA
```

This is a responsibility map, not a mandate to create a directory for every
type. The first implementation step should extract only seams demonstrated by
the current code and the three jurisdictions.

## Baseline

The design started from committed `HEAD` `b57c44f8d7486a4320b7a0f720e83e4e009220eb`
(`feat: add offline WV land behavioral evaluation framework`). The working
tree was clean before this phase. The installed Node runtime remains the
compatibility baseline; frozen fixtures and dependency versions are unchanged.

The completed implementation has these relevant facts:

- `src/core/typed-flow.ts` is topology-neutral ordered-step execution with
  input/output validation, immutable artifact crossing, and fail-closed
  required steps.
- `src/core/orchestrator.ts` contains generic agent execution and run records,
  but also owns the current generic review status and a simple file store
  relationship.
- Core runtime contracts are neutral and concrete storage is injected through
  `RunStore`/`RunArtifactStore`; `orchestrator.ts` retains only the intentional
  public compatibility re-export of run types.
- `src/domains/wv-land/contracts.ts` contains source identity/snapshot/evidence,
  provenance, findings, conflicts, unknowns, `Well`, `ProductionRecord`, and
  WV aliases for evidence.
- `src/domains/wv-land/flow.ts` contains WV flow input/output, agent execution
  requests, validation, and the three-step flow.
- `src/domains/land-administration/jurisdictions/wv/publishers/` contains the
  WV source port, ArcGIS behavior, WVDEP and WVGES field maps, and the WVDEP
  workbook parser; `wv-land/index.ts` is a documented legacy façade.
- `src/domains/wv-land/persistence.ts` combines durable aggregate validation,
  atomic publication/recovery, review packet/decision history, and WV land
  state.
- `src/evaluations/wv-land.ts` combines fixture loading, WV parsing and field
  expectations, generic execution-kind/measurement mechanics, land grounding
  checks, WV source-independence checks, and WV fixture cases.

The current separation between `SourceAdapter` and `RetrievalProvider`, the
independence of WVDEP and WVGES, and Phase 4's conservative production
aggregation are preserved as compatibility requirements.

## Empirical evidence from WV, OH, and PA

Sources below were consulted on **2026-09-04**. The architecture records
metadata and documentation rather than downloading datasets. Government
endpoints and their fields can change; an adapter must retain the exact URL,
bytes, hash, parser version, and retrieval time for any captured evidence.

### West Virginia

The existing WV source understanding is documented in
[WV land architecture](WV_LAND_ARCHITECTURE.md). The primary regulatory source
is the [WVDEP ArcGIS REST directory](https://tagis.dep.wv.gov/arcgis/rest/services),
including the oil-and-gas `MapServer` and its `All DEP Wells` layer. The
independent geological source is the [WVGES OilGas_WVOG service](https://atlas2.wvgs.wvnet.edu/server/rest/services/OilGas_WVOG/WVOG_Layer/MapServer).
WVDEP also publishes annual production workbooks from its [database
information page](https://dep.wv.gov/oil-and-gas/databaseinfo/Pages/default.aspx).

Phase 2–3 evidence demonstrates that WVDEP and WVGES can disagree on operator
or expose different historical/source fields for the same API. WVDEP uses
regulatory well/permit/status fields; WVGES exposes geological, historical,
farm/lease, mineral, and operator-related values. The adapter must retain
publisher identity and must not merge these claims into a preferred truth.

### Ohio

The official [ODNR Oil & Gas Well Database](https://apps.ohiodnr.gov/oilgas/RBDMSReports/default.aspx)
provides well information and reports, including [completions](https://apps.ohiodnr.gov/oilgas/rbdmsreports/Reports_Completions.aspx).
The public interface accepts an API well number, producing formation, well
name, spud date, plug date, and status. Its status vocabulary includes
producing, drilled/inactive, plugged and abandoned, domestic, injection,
storage, historical production, and other lifecycle states. That vocabulary
is not a safe shared enum with WV or PA.

ODNR's [GIS information catalog](https://apps.ohiodnr.gov/gims/response.asp?category=Select&county=Statewide)
lists statewide oil-and-gas well locations, oil/gas well-pad data, horizontal
drilling units, and oil/gas unitizations. These are separate concepts from a
single well row and are evidence against putting pad/unitization fields into a
minimal shared `Well` record.

### Pennsylvania

The official [PA DEP GIS page](https://www.pa.gov/agencies/dep/data-and-tools/gis)
describes the Oil and Gas Mapping application as covering conventional and
unconventional wells, producing and non-producing wells, and queries by permit,
operator, county, and municipality/MCD. The [PA DEP oil-and-gas reports page](https://www.pa.gov/agencies/dep/data-and-tools/reports/oil-and-gas-reports)
lists production, permits, SPUD, county, operator, inspections, violations,
well formations, pads, and well-production-status reports. The [production
extract](https://greenport.pa.gov/ReportExtracts/OG/OilGasWellProdReport)
states that the data is reported by operators, is selectable by reporting
period, and exports CSV.

The [PASDA DEP oil/gas location metadata](https://www.pasda.psu.edu/uci/FullMetadataDisplay.aspx?file=OilGasLocations_ConventionalUnconventional2025_08.xml)
documents fields including `PERMIT_NUM`, `WELL_NAME`, `OPERATOR`, `OPER_NUM`,
`WELL_TYPE`, `WELL_STAT`, permit and SPUD dates, county and county ID, and
municipality/MCD. It identifies NAD 83 as the horizontal datum. The official
[PA DEP home-use guidance](https://www.pa.gov/agencies/dep/programs-and-services/oil-and-gas/home-use-gas-wells)
describes the PA API/permit identifier as the `37` prefix, county code, and
DEP unique identifier, and describes the separate OGO operator number.

PA therefore supplies a useful sanity check: a PA adapter must not assume that
API is the only operational identifier, that county is sufficient location
context, that a publisher has WV-style farm/lease fields, or that annual
production has WV's workbook semantics. PA's conventional/unconventional
classification and municipality are jurisdiction/source facts, not additions
to every shared land record.

### Cross-jurisdiction comparison

| Concept | WV evidence | OH evidence | PA evidence | Architectural conclusion |
| --- | --- | --- | --- | --- |
| Well identity | API and source record IDs; WVDEP permit IDs; WVGES API-keyed records | API well number plus ODNR database record/report identity | API/permit number plus DEP unique and operator numbers | Shared identity is a typed identifier set with publisher identity; normalization rules remain jurisdiction-specific. |
| Permit | WVDEP permit ID and permit fields | Permit/plug and completion reports | `PERMIT_NUM`, permit dates, permit reports | Shared `PermitReference` may be a thin relationship; no universal permit shape yet. |
| County/municipality | County is common in current WV facts | County appears in ODNR GIS catalog and reports | County plus municipality/MCD are explicit query/data concepts | County is shared location context; municipality is optional land-domain context, not a WV field. |
| Operator | Current and completion/operator fields; WVDEP/WVGES may disagree | Operator appears in database/report context | Operator name and OGO/operator number | Keep name and publisher operator ID as separate source facts. |
| Well name/number | WVDEP/WVGES labels and well number | ODNR well name and API | PA well name and permit-related records | Shared display name is optional; publisher record labels remain extensions. |
| Status/type/use | WVDEP status, type, use | Broad ODNR status list and formation/type choices | PA well status/type codes and conventional/unconventional distinction | Store raw values; normalized values require a jurisdiction policy and must be nullable. |
| Coordinates | WV source geometry/fields; current normalized record is surface location | GIS catalog provides well locations; coordinate/projection varies by dataset | PA location datasets use NAD 83; mapping only includes wells with location | Model coordinate as a value with CRS/datum and role; do not silently treat all points as equivalent. |
| Formation/depth | Formation, measured/true vertical depth in selected WV sources | Producing formation, completions, depth-related records | Formation reports and source-specific fields | Optional common geology facts; source-specific depth/formation semantics stay in extensions. |
| Dates | Permit/issued/completion and source publication/retrieval dates | Spud, plug, completion and lifecycle dates | Permit, SPUD, production/reporting periods | Common date values need a date role/precision; semantics remain source/jurisdiction policy. |
| Historical/revised records | WVGES historical rows and WVDEP source differences | Corrections and historical production status are visible in reports | DEP reports and operator-reported data can be revised | Preserve source records and revisions; never overwrite by default. |
| Production | WVDEP annual workbook; MCF/barrels; no-match is not zero | Must be discovered from ODNR reporting/database semantics | Monthly reporting periods and operator-reported CSV extracts | Shared period/value/unit/provenance kernel; aggregation and no-match policy are adapter/domain rules. |
| Lease/farm/unit/pad | WVGES farm/lease evidence; WVDEP fields; not title proof | ODNR horizontal drilling units, unitizations, pads | PA mapping and reports use well/permit/operator/MCD concepts; different grouping vocabulary | Do not put all grouping terms into `Well`; represent relationships or publisher extensions only when a workflow needs them. |

## Layer definitions and dependency direction

### Core runtime and infrastructure

`src/core` owns definition loading, typed step execution, provider-neutral
agent execution boundaries, configuration, security, telemetry, tool registry,
and generic run mechanics. It may know that a run has an ID, status, flow,
outputs, errors, and review state, but it must not know land, wells, WVDEP,
WVGES, ODNR, PA DEP, or a jurisdiction's identifier/status vocabulary.

### Shared evidence, judgment, and review; evaluation is supporting capability

This supporting layer owns concepts that remain useful in a future non-land
domain:

- immutable source identity and snapshot metadata;
- generic source evidence linkage, when its facts are parameterized rather
  than land-shaped;
- provenance links to a run/step/producer;
- generic findings, conflicts, and unknowns as evidence-bounded judgments;
- review decision/lifecycle records and append-only history;

Evaluation is a cross-cutting capability rather than a domain layer parallel
to land/jurisdiction/publisher. Its generic mechanics live beside the shared
contracts, while land and jurisdiction policies interpret opaque artifacts.
Persistence/review follows the same pattern: generic mechanics plus
domain-owned state and projections.

This layer must not add `apiNumber`, `permitId`, `Well`, `ProductionRecord`,
title, lease, mineral, parcel, or jurisdiction policy to the shared contracts.
Generic judgment must not silently imply a legal conclusion: `Finding` is a
structured claim with evidence and provenance, not an ownership or title
decision.

### Shared land administration

This layer owns case identity/intake, submitted land package shape where it is
truly common, the minimal shared `LandWell` and `LandProductionRecord`
projections selected for the portability migration, reconciliation artifacts, land flow contracts, and land-specific
grading such as evidence grounding, case isolation, source-record
relationships, and no-match versus reported-zero where production workflows
need it.

It may depend on shared evidence/judgment/review and runtime ports. It must not
depend on WV, OH, PA, or a publisher. A land `Well` is not a universal well
schema: it is a deliberately small normalized view with optional values and
source-specific extension/evidence links.

### Jurisdiction policy and implementation

`wv`, `oh`, and `pa` implementations own identifier interpretation, status/type
normalization, source-selection and independence policy, source requirements,
flow configuration, and jurisdictional business/regulatory rules. They may
depend on shared land and shared evidence ports. They may not change shared
contracts merely to accommodate a publisher field.

### Publisher/source adapters

Publisher adapters own raw schemas, query construction, publisher record
identity, parsing, pagination choices, field mapping, source-specific warnings,
and source-specific extensions. A WVDEP adapter and WVGES adapter remain
independent even when both produce a shared well view. ODNR and PA DEP adapters
are peers, not subclasses of a WV adapter.

The intended direction is:

```text
core/runtime and retrieval infrastructure
                 ↓
shared evidence/judgment/review
                 ↓
shared land administration
                 ↓
jurisdiction policy and flows
                 ↓
publisher/source adapters and parsers
```

The arrows mean “may depend on,” not data flow. Publisher adapters can consume
generic retrieval ports and emit shared evidence; they must not make the
generic runtime import the land layer.

Allowed imports:

- core → core and neutral retrieval/run contracts only; core must not import a
  retrieval implementation;
- shared evidence/review → core primitives only;
- land → core plus shared evidence/review;
- jurisdiction composition → land plus shared evidence/review, source ports,
  and concrete publisher adapters;
- publisher adapter → neutral retrieval/evidence contracts and publisher-local
  mapping definitions, never a concrete jurisdiction orchestrator.

Prohibited imports:

- core importing any land, jurisdiction, or publisher module;
- shared evidence/review importing land;
- shared land importing `wv`, `oh`, `pa`, WVDEP, WVGES, ODNR, or PA DEP;
- a publisher adapter importing another publisher's normalized adapter;
- generic evaluation importing WV cases or source names;
- an agent importing a retrieval implementation or performing parsing,
  hashing, normalization, or arithmetic.

Composition roots are the only place that constructs concrete providers such as
`LocalDocumentRetriever`, `HttpSourceRetrievalProvider`, `FileRunStore`, or a
WV publisher adapter and injects them into neutral ports. No dependency
injection framework is required.

Future architecture tests should scan resolved TypeScript imports and fail on
these forbidden edges. A small dependency-rule table is preferable to a
framework or plugin registry.

## Classification of current abstractions

“Current boundary correct?” means correct as a target responsibility, not that
the current physical path is already ideal. “Extract now?” means extract in
the behavior-preserving migration. A shared abstraction does not require
complete second-jurisdiction implementation when its responsibility is
demonstrated independently of the flagship; it must remain limited to
demonstrated workflow needs and must not speculate about unverified
jurisdiction semantics.

| Current abstraction | Current location | A/B/C/D/E | Current boundary correct? | Why | Proposed destination/name | Extract now? |
| --- | --- | --- | --- | --- | --- | --- |
| `SourceIdentity` | `src/domains/wv-land/contracts.ts` | B | No, responsibility is generic | Dataset/publisher/mechanism metadata has no land field; `mechanism` should become an extensible transport/source descriptor rather than a WV union. | `src/evidence/contracts.ts`, `SourceIdentity` | Yes |
| `SourceSnapshot` | same | B | No, responsibility is generic | Exact-byte retrieval metadata and immutability are cross-domain. | `src/evidence/contracts.ts`, `SourceSnapshot` | Yes |
| `SourceEvidence<TFacts>` | same | B | Partly | The envelope is reusable; normalized facts are not. | Shared generic `SourceEvidence<TFacts>`; land aliases in land layer | Yes |
| `Finding` | same | B | No, mostly generic | Evidence links, status, provenance, and case identity are reusable; legal meaning is supplied by the consumer. | `src/evidence/judgment.ts`, `Finding` | Yes |
| `Conflict` | same | B | No | Competing evidence claims are reusable as aggregate-scoped children; case/run scope is inherited from the containing aggregate. | `src/evidence/judgment.ts`, aggregate-scoped `Conflict` | Yes |
| `Unknown` | same | B | No | Explicit unanswered questions are reusable as aggregate-scoped children; case/run scope is inherited from the containing aggregate. | `src/evidence/judgment.ts`, aggregate-scoped `Unknown` | Yes |
| provenance types | same | B | No | Run/step/input/source/producer lineage is generic; source IDs should remain opaque. | `Provenance` in shared evidence/judgment | Yes |
| `Well` | same | C | No | The current concrete record is WV-biased: API-only identity, WV lease/farm labels, no role-aware coordinate/CRS, and raw status strings. | `LandWell`: minimal shared workflow projection plus publisher evidence/extensions | **EXTRACT NOW** |
| `ProductionRecord` | same | C | No | Current fields encode WV commodity columns and year/month assumptions; OH production metadata is not yet characterized. | `LandProductionRecord`: minimal shared observation projection; WV schema remains publisher-specific | **EXTRACT NOW** |
| `WvWellEvidence` | same | No | No | The envelope is shared, but the current fact type is a WV publisher fact rather than the shared projection. | WV publisher evidence mapped to `LandWell` | **KEEP WV-SPECIFIC** |
| `WvProductionEvidence` | same | No | No | It is a WV publisher fact and must not define shared production semantics. | WV publisher evidence mapped to `LandProductionRecord` where valid | **KEEP WV-SPECIFIC** |
| `WvLandRecord` | same | No | No | Union mixes generic evidence/judgment and land records under WV. | Land record union, or avoid a broad union and persist typed aggregate parts | Yes |
| codecs | `fact-codec.ts`, `judgment-codec.ts`, `source-codec.ts` | B/C/E | Partly | JSON boundary mechanics are reusable; field validation is evidence/judgment/land-specific; source codecs currently combine both. | shared JSON boundary; shared evidence/judgment codecs; land codecs; jurisdiction codecs only for raw schemas | Yes, incrementally |
| `WvFlowInput` | `src/domains/wv-land/flow.ts` | C/D | No | It embeds WV evidence aliases and a WV flow ID while also carrying shared land workflow input. | `LandWellReconciliationInput` plus WV flow policy/configuration | Yes |
| `WvFlowResult` | same | C/D | No | Result shape is land workflow-shaped; flow ID/status policy is jurisdiction-specific. | shared land result plus jurisdiction flow result/config | Yes |
| `WvAgentExecutor` | same | C/D | No | Execution of a typed agent step is generic, but its current request/result/policy payloads are WV/land-shaped. | Generic execution boundary in core; WV adapter owns payload and policy | **EXTRACT NOW** |
| `WvLandRunAggregate` | `persistence.ts` | C | No | Aggregate contents are land-specific, while publication/recovery mechanics are generic. | land durable aggregate composed with generic durable run envelope | Yes, after contracts |
| `FileWvLandRunStore` | same | A/C | No | File mechanics and validation are interleaved with land state. | generic atomic durable-run store + land aggregate repository | Yes |
| `WvLandRunService` | same | C | No | Service is a thin WV facade over persistence; review lifecycle should be shared. | land run service using shared store/review ports | Yes |
| review packet/decision types | same | B/C | Partly | Append-only decisions, lineage, reviewer/reason, and packet references are generic; proposed route and source snapshot list are land-facing fields. | shared review lifecycle; land review packet projection | Yes |
| evaluation execution-kind model | `src/evaluations/wv-land.ts` | A | No | `WvExecutionKind` and executor authenticity are generic harness mechanics. | `src/evaluations/core/` | Yes |
| measurement status | same | A | No | collected/not-collected/failed behavior is generic measurement state. | evaluation core | Yes |
| evaluation check/hard-gate mechanics | same | A | No | Check outcomes, hard failures, diagnostic score, and summary aggregation are generic. | evaluation core | Yes |
| land-specific evaluation expectations | same | C | No | Findings, conflicts, unknowns, grounding, case isolation, routes, and production absence semantics are land grading. | `src/evaluations/land-administration/` | Yes |
| WV-specific evaluation expectations | same | D/E | No | Fixture IDs, WV source IDs, field paths, WV parser rules, and independence are WV policy/cases. | `src/evaluations/wv/` or `evaluations/policies/wv/` | Yes |
| fixture-loading mechanics | same | A/C/D | No | JSONL case loading and frozen-byte verification are reusable; WV paths and parsers are not. | generic case/fixture loader; land/WV fixture policy | Yes |
| `RetrievalProvider` | `src/core/ports.ts` | A | Yes, with a narrower name/port possible | Retrieval is generic and must not know source adapter semantics. | generic retrieval port/infrastructure | No immediate move |
| `SourceAdapter` | `src/domains/wv-land/adapters/source-adapter.ts` | C/E | No | The port is a source adapter seam, but its current placement/type is WV and its query is API/permit-shaped. | land source port with publisher/jurisdiction query types | Yes, after shared evidence |
| ArcGIS transport/pagination | `adapters/arcgis.ts` | A/E | Partly | URL/query paging and response mechanics can be generic source infrastructure; field maps and normalization are publisher-specific. | `src/retrieval/arcgis/` transport/paginator plus adapter mapping | Later, when OH/PA demonstrate need |

## Domain-model decisions

### Evidence, judgment, and provenance

`SourceIdentity`, `SourceSnapshot`, and the `SourceEvidence<TFacts>` envelope
are reusable if their facts remain generic. The shared contract must not grow
land fields, and `mechanism` must not become a closed list that assumes all
future domains use ArcGIS or XLSX. A source identity describes a publisher and
dataset; a snapshot describes one exact retrieval; evidence links one
publisher record to its snapshot and normalized facts.

`Finding`, `Conflict`, `Unknown`, and `Provenance` are reusable with an
explicit scope invariant. The selected design is **aggregate-scoped
children**: a `Conflict` or `Unknown` is not standalone durable state and may
be transported or persisted only inside a containing case/run aggregate that
supplies its case and run identity. `Finding` already carries case identity;
its links to conflicts and unknowns must resolve within the same aggregate.

The shared validation rule is: every evidence reference resolves to evidence
available to the containing aggregate; no child may be attached to another
case/run; and standalone persistence of an unscoped conflict or unknown is
rejected. The land aggregate validator currently enforces the relationship
checks around findings, evidence, and the scoped judgment container. These
contracts must not
contain title, mineral, lease, parcel, API, permit, operator, or state-specific
semantics.

### Well: minimal shared Land Administration concept

Extract `LandWell` now as the smallest shared land concept required by the
current reconciliation workflow. It is a projection, not a universal well
schema:

```ts
type LandWell = {
  wellId: string; // normalized identity chosen by jurisdiction policy
  identifiers: readonly IdentifierReference[];
  name?: string;
  county?: string;
  municipality?: string;
  operator?: PartyReference;
  status?: NormalizedStatus;
  type?: NormalizedWellType;
  formation?: string;
  surfaceLocation?: Coordinate;
  bottomHoleLocation?: Coordinate;
  dates: readonly DatedEvent[];
  evidenceIds: readonly string[];
  extensions?: Readonly<Record<string, JsonValue>>;
};
```

`IdentifierReference` must retain identifier kind, value, jurisdiction, publisher, and source record
context. A ten-digit API is common evidence but not the only identity key. A
coordinate must include role (`surface` or `bottom-hole`), latitude/longitude,
horizontal CRS/datum, and precision/quality where supplied. Do not silently
label a projected coordinate WGS84 or treat a surface point as bottom hole.

The required shared fields are a stable workflow identity, source-backed
identifier references, source evidence links, and any coordinate needed by the
workflow. Name, number, operator, county, coordinate role/CRS, and dates are
optional normalized fields only where current workflow behavior consumes them.
Status and type are nullable policy outputs that retain the publisher raw
value and source evidence. Formation is not shared unless a workflow
requirement demonstrates it. Publisher-only fields belong in opaque,
namespaced extensions or source evidence, not in an ever-growing `Well`
interface.

WV, Ohio, and Pennsylvania can each provide this subset without moving
municipality/MCD, operator numbers, pads, conventional/unconventional
classification, or other publisher fields into the shared contract. The
jurisdiction adapter interprets identifiers/status/type and maps valid facts;
the publisher evidence retains the raw values.

The field classification is deliberately explicit:

- **Required shared concept:** stable workflow identity, source-backed
  identifier references, evidence linkage, and any workflow-required
  coordinate with role and CRS/datum.
- **Optional normalized shared concept:** name/number, operator, county,
  lifecycle date, status, or type only when the shared workflow consumes it;
  normalized status/type remain nullable policy outputs.
- **Jurisdiction-specific:** identifier interpretation, status/type vocabulary,
  municipality/MCD, operator numbers, and any jurisdiction lifecycle meaning.
- **Publisher-specific/raw evidence:** raw labels, raw identifiers, pad and
  unitization fields, formations not required by workflow, and source-native
  coordinate details.
- **Not yet justified:** a universal formation field, universal well type or
  status enum, or any field added only because multiple publishers expose a
  similarly named value.

### Production: minimal shared Land Administration concept

Extract `LandProductionRecord` now as a minimal source-backed production
observation. The common kernel is an identified well/reference subject and
explicit reporting period, value, unit, source identity, and provenance. It
must distinguish:

- no matching source record;
- a matching record with a reported zero;
- a matching record with a value omitted or unavailable;
- a reported value whose period or unit is incompatible with another value.

WV's annual workbook and PA's monthly operator-reported CSV demonstrate that
period and unit semantics matter, but neither defines a universal commodity
taxonomy, monthly cadence, publisher identifier, or `UnitValue` hierarchy.
Publisher-specific production records normalize into this projection only
where their semantics are valid. The WV workbook schema/parser and WV
normalization remain WV/publisher-specific.

This shared concept does not establish complete Ohio production semantics.
Official ODNR production metadata must be characterized before implementing an
Ohio production adapter or mapping. The shared projection must remain narrow
enough to represent “no matching production evidence” separately from a
matching record with a reported zero, and to preserve explicit periods, units,
source identity, provenance, and reported values. Phase 4 fail-closed behavior
remains mandatory: duplicates, overlaps, incompatible units, and missing
evidence are surfaced rather than fabricated or silently summed.

### Generic agent-execution boundary

Extract the responsibility behind `WvAgentExecutor` now, but do not move its
WV-shaped payloads. The generic core owns only typed step execution mechanics:
accept an agent identifier plus a domain-owned request, invoke the supplied
execution boundary, and return a domain-owned result or explicit execution
failure with deterministic step/provenance metadata. A minimal conceptual
boundary is:

```ts
interface AgentExecutionBoundary<TRequest, TResult> {
  execute(agentId: string, request: TRequest): Promise<TResult>;
}
```

The generic contract must not know WV, WVDEP, WVGES, `WvFlowInput`,
`WvFlowResult`, source-selection policy, or land evidence semantics. Land and
jurisdiction composition own the typed request/result/policy and adapt them to
this boundary. No generic factory, DI framework, plugin system, executor
hierarchy, or abstract base class is introduced. The existing WV executor can
become a thin WV composition adapter while typed-flow mechanics consume only
the generic boundary.

### Land case and public evidence

A land case may contain a submitted package, well/production reconciliation,
and a review projection. It must not equate public well/regulatory evidence
with title, ownership, mineral rights, lease validity, or payment entitlement.
County deed/title integration is outside this architecture.

## Agent and flow architecture

The three canonical agents remain bounded evidence-based judgment components:

- `land-case-intake` identifies scope, supplied clues, missing evidence, and
  candidate queries without inventing identifiers;
- `land-well-reconciler` compares submitted claims with normalized independent
  evidence and emits findings, conflicts, and unknowns;
- `case-synthesizer` preserves the artifacts and proposes one human route.

Their responsibilities can be reused unchanged or nearly unchanged in OH and
PA when the flow supplies normalized evidence and jurisdiction policy context.
The prompts must stop naming WVDEP/WVGES as if they were intrinsic to the
reusable agent. Source requirements, source-independence rules, identifier
semantics, and status/type interpretation belong in a jurisdiction flow
configuration or policy input. A policy can say that WV requires independent
WVDEP and WVGES evidence; an OH policy can require ODNR datasets; a PA policy
can distinguish DEP mapping, production reports, and other evidence. The
agent still does not acquire, parse, normalize, hash, or calculate public
evidence.

Agent IDs stay jurisdiction-neutral because the responsibility is shared.
Flow IDs remain jurisdiction-specific (`wv-land-well-reconciliation`,
`oh-land-well-reconciliation`, `pa-land-well-reconciliation`) because routing,
source requirements, and policy are jurisdictional. The flow owns sequencing;
deterministic services own identifier normalization, parsing, coordinate/date
handling, hashing, and arithmetic; source adapters own acquisition/mapping;
agents own bounded judgment.

`case-synthesizer` retains presentation wording that can be refined in a later
prompt-polish pass, but runtime ownership is now neutral: the WV flow adapts
its payload at the generic execution boundary, while policy remains in WV
composition. No live acquisition or later-jurisdiction implementation is part
of this migration.

## Source architecture

`RetrievalProvider` and `SourceAdapter` are different ports:

```text
generic byte/document retrieval
          ↓ exact bytes + snapshot metadata
jurisdiction/publisher source adapter
          ↓ publisher-specific parse and normalization
shared land evidence + source provenance
          ↓
bounded agent judgment
```

Neutral retrieval contracts own the shape of retrieved documents/bytes and
snapshot metadata. Concrete HTTP/static providers own retrieval mechanics,
limits, timeouts, and exact-byte capture. Generic byte hashing, expected-hash
comparison, and immutable-snapshot verification are reusable primitives, but
they are not fixture policy. None of this knows API fields, permit syntax, or
source authority.

An adapter owns publisher query construction, raw schema parsing, stable source
record identity, publisher field mapping, and source-specific warnings. It may
extract a raw publisher identifier, but it must not depend upward on a
concrete jurisdiction policy. Jurisdiction composition owns interpretation and
normalization of that raw identifier, status/type values, source requirements,
and independence policy, then maps the evidence stream into the land workflow.

The composition direction is therefore:

```text
neutral retrieval/source infrastructure
                 ↓
publisher adapter
                 ↓
normalized publisher evidence
                 ↓
jurisdiction composition and policy
                 ↓
shared land workflow
```

WVDEP and WVGES remain separate adapter/evidence streams; WV policy may
require both without making either adapter depend on the policy.

ArcGIS is a transport/source-infrastructure seam, not a land-domain concept.
WV, OH, and PA may all use ArcGIS, but a reusable ArcGIS client may only own
URL construction primitives, response decoding, pagination, transfer-limit
handling, and exact-byte retrieval. It must not own `api`, `permitid`, `MCD`,
WVDEP, ODNR, or PA DEP fields. Field maps remain in each publisher adapter.

## Evaluation architecture

`src/evaluations/wv-land.ts` currently mixes four layers. The target split is:

1. **Evaluation core** — opaque case/artifact/measurement handling,
   execution-kind model, measurement states, executor authenticity descriptor,
   check result, hard-gate calculation, diagnostic score, result aggregation,
   and generic JSONL case loading. It must not import `Finding`, `Conflict`,
   `Unknown`, `Well`, `ProductionRecord`, WV flow types, WVDEP, or WVGES.
2. **Land evaluation semantics** — finding/conflict/unknown grounding, case
   isolation, evidence/provenance relationships, land route expectations, and
   no-match versus reported-zero expectations where land production applies.
3. **Jurisdiction policy** — source independence, field mappings, parser
   normalization rules, source-specific expected IDs, and required source
   relationships. It consumes generic byte/snapshot verification results but
   owns fixture directory structure, raw field paths, source relationships,
   Braxton identity, and workbook expectations.
4. **Cases/fixtures** — WV Braxton fixture and WVDEP/WVGES/production cases.

An Ohio suite would use layers 1 and 2 unchanged, provide OH policy and cases,
and use ODNR fixtures/adapters. It would not copy the executor-binding
authenticity logic, measurement state, hard gates, evidence grounding, or
summary engine. A PA suite would likewise use the first two layers while
keeping PA's permit/MCD/conventional-production expectations local.

The generic evaluator must not know WVDEP/WVGES. The generic suite must report
“not collected” for absent external behavioral execution; predefined replay or
stub output cannot become a model-quality measurement. Deterministic fixture
checks remain separate from behavioral measurement.

## Persistence and review architecture

The historical Phase 6 implementation combined these concerns in
`FileWvLandRunStore`; the completed migration now separates them:

- generic file paths, JSON-safe canonical serialization, atomic write-once
  publication, and recovery;
- generic durable run identity and run-record synchronization;
- review packet, decision history, revision lineage, and reviewer controls;
- land submitted package, source snapshots/evidence, findings, conflicts,
  unknowns, and WV flow result.

The target is a set of small generic capabilities that preserve these
invariants:

- atomic/fail-closed publication and recovery;
- append-only review history;
- revision lineage;
- case/run consistency;
- JSON-safe canonical persistence;
- evidence snapshot relationships;
- no consequential action on approval.

Persistence A supplies atomic file/publication and canonical JSON mechanics;
Persistence B supplies neutral run identity/storage ports and an envelope;
Persistence C supplies append-only review decisions, revision lineage, and
domain-neutral state transitions; Persistence D remains the land aggregate
repository and review projection. The land repository supplies a typed durable
aggregate containing shared
evidence/judgment and land result state. Jurisdiction-specific state is an
explicit extension, not a reason to clone the store. Ohio should use the same
generic file mechanics, durable run envelope, and review lifecycle with an OH
aggregate/flow result. There should be no `OhLandRunStore` clone.

Review lifecycle is generic; a land review packet projection can add proposed
route, evidence snapshot IDs, and land findings. “Approved” means a human
review decision was recorded, not that a filing, payment update, registry
change, owner communication, or title conclusion occurred.

## Proposed physical structure

The smallest useful future structure is:

```text
src/
  core/
    ... runtime, ports, ordered typed steps ...
  retrieval/
    ... generic retrieval and optional arcgis transport ...
  evidence/
    contracts.ts
    judgment.ts
    codecs.ts
  evaluations/
    core.ts
    land-administration.ts
    jurisdictions/
      wv.ts
      oh.ts
      pa.ts
  domains/
    land-administration/
      case.ts
      well.ts
      production.ts
      reconciliation.ts
      source-port.ts
      flow.ts
      persistence.ts
      review.ts
      jurisdictions/
        wv/
          flow.ts
          policy.ts
          publishers/
            wvdep.ts
            wvges.ts
            production.ts
          tools/
        oh/
          ... added later ...
        pa/
          ... added later ...
```

This is not a requirement to create all files now. Keep cohesive codecs and
behavioral services together where they have one owner. Do not create generic
factories, abstract base classes, state registries, plugin systems, or a
general workflow/DAG engine before a demonstrated second implementation needs
one. The current domain Markdown can remain the source of business behavior;
jurisdiction policy should be declarative where that improves reviewability.

## Naming rules

- Generic runtime/evidence/review abstractions have no `Wv`/`WV` prefix.
- Shared land abstractions use land-oriented names only where needed (`LandWell`,
  `LandProductionRecord`, `LandCase`).
- WV TypeScript implementations use `Wv...` when the implementation is
  genuinely WV-specific (`Wvdep...`, `Wvges...`, `WvLand...`).
- Machine IDs and directories use `wv` or `wv-land`; human prose uses WV or
  West Virginia; official publisher acronyms remain WVDEP and WVGES.
- Ohio-specific TypeScript names may use `Oh...` only for jurisdiction policy
  or implementation; ODNR remains the official publisher name.
- Pennsylvania-specific names follow the same rule; PA DEP/PASDA are source
  terminology, not generic type names.

Names that should eventually disappear from shared/public exports include
`WvWellEvidence`, `WvProductionEvidence`, `WvLandRecord`, `WvFlowInput`,
`WvFlowResult`, `WvLandRunAggregate`,
`FileWvLandRunStore`, and `WvLandRunService` when their behavior has moved to
shared land or generic layers. Names that should remain are actual WV
implementations and policies: WVDEP/WVGES adapters, WV parser/field-map
types, WV source identities, WV fixture/policy modules, and the
`wv-land-well-reconciliation` flow.

## Ohio extension proof

Adding `oh-land-well-reconciliation` under this design would add:

- an OH flow definition and source policy/configuration;
- ODNR source adapters and raw schemas for well/completion/production or
  report sources;
- Ohio identifier, status/type, formation, coordinate, and lifecycle-date
  interpretation;
- ODNR fixtures and Ohio evaluation policy/cases;
- genuinely Ohio-specific unitization, horizontal drilling unit, pad, or
  regulatory rules only if the workflow needs them.

It would reuse unchanged:

- `core` typed ordered-step and generic agent-execution mechanics;
- retrieval and snapshot/hash mechanics;
- shared evidence, provenance, finding/conflict/unknown contracts;
- minimal shared `LandWell` and `LandProductionRecord` projections;
- land case/reconciliation contracts and land agent responsibilities;
- generic evaluation core and land evaluation semantics;
- durable-run publication/recovery and review lifecycle;
- consequential-action blocking and human-review controls.

Ohio maps its valid source facts into the shared well and production
projections without widening them for publisher fields. Its production
adapter/mapping remains deferred until authoritative ODNR production metadata
is characterized. Existing modules requiring boundary updates are the land
flow builder, neutral composition roots, catalog discovery, and eventual
policy-aware evaluation routing. No executor, evaluator, persistence, or
review clone is permitted.

## Pennsylvania sanity check

PA should add DEP/PASDA adapters, PA permit/API/operator-number interpretation,
municipality/MCD mapping, conventional/unconventional and status/type policy,
NAD 83/coordinate-role handling, and monthly operator-reported production
cases. PA's well-pad, formation, compliance, historical, and document concepts
remain source/jurisdiction extensions until a second land workflow proves a
shared need.

The design must resist adding `operatorNumber`, `MCD`, `conventionalFlag`, or
PA report-specific columns to every `LandWell` merely because one PA adapter
has them. Keep them as typed PA extensions or evidence facts, with explicit
relationships when a workflow needs them. This test is important because a
WV/OH abstraction could otherwise become an Appalachian two-state schema that
fails on PA immediately.

## Migration strategy and compatibility baseline

The ordered behavior-preserving migration is recorded in
[MULTI_JURISDICTION_IMPLEMENTATION_PLAN.md](MULTI_JURISDICTION_IMPLEMENTATION_PLAN.md).
Each extraction keeps the current WV exports or a short-lived adapter at the
boundary, migrates callers in the same step, and deletes the old WV-only
contract once no caller remains. Existing Phase 1–7 tests, frozen fixtures,
fail-closed acquisition behavior, source independence, production semantics,
review invariants, and evaluation measurement rules are the compatibility
baseline.

## Explicit non-goals

This architecture does not implement Ohio or Pennsylvania, modify the agent or
flow definitions, or begin Phase 8 or Phase 9. It also excludes title/mineral
ownership determination, county deed/title integration, OCR, legal
conclusions, consequential-action execution, a generalized workflow/DAG
engine, retries/parallel/distributed orchestration, Foundry/Azure provider
implementation, H6A or broad production-source integration, and UI work.

Human review remains mandatory before consequential action. Public well,
regulatory, geological, and production evidence is never title proof.
