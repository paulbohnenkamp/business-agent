---
id: 011-local-wv-demo
title: Local West Virginia flagship demo
status: completed
created: 2026-09-04
updated: 2026-09-04
result: results/011-local-wv-demo.md
---

## Goal

Make the existing West Virginia well-reconciliation workflow demonstrable in a browser using the checked-in synthetic case and frozen public evidence, without Azure credentials, live government requests, or a UI-only simulation.

## Non-goals

- Azure deployment or Azure infrastructure.
- Live source refresh, authentication, production databases, or external actions.
- Ohio/Pennsylvania work or portability refactoring.
- A general workflow designer, chatbot, or dashboard.

## Current-state findings

- The typed `wv-land-well-reconciliation` flow already validates and sequences `land-case-intake`, `land-well-reconciler`, and `case-synthesizer`.
- The Braxton fixture already contains synthetic submitted input, immutable snapshots, normalized WVDEP/WVGES evidence, and a production no-match result.
- Persistence already stores WV aggregates and append-only review decisions.
- Next.js currently exposes only a generic home page and a run-ID review form; no browser route invokes the typed WV flow.
- No local provider-neutral WV executor is wired for the browser. Existing behavioral evaluation intentionally requires an external executor.

## Chosen approach

Add a fixture-backed local demo service that validates and loads the existing fixture, invokes the real typed flow through a deterministic provider-neutral executor, persists the resulting aggregate, and exposes case/run/review APIs. Build one case workspace with progressive evidence detail, structured workflow state, conflict/unknown/findings presentation, synthesis, and human review actions. Keep the executor in an explicit seam and document that it is a deterministic local demonstration adapter pending Azure AI execution.

## Acceptance criteria

- `npm run dev` opens one professional case workspace at `/` without required environment setup.
- The browser can run the Braxton synthetic case through all three real typed flow steps.
- WVDEP and WVGES evidence remain separately visible, including the operator conflict.
- Production clearly distinguishes no matching evidence from reported zero.
- Findings expose assertion, status, confidence, rationale/evidence links, conflicts, and unknowns.
- Synthesis and human review are shown as a proposed route and a separate review decision; no consequential action is implied.
- Runs and review decisions persist through existing domain persistence boundaries.
- README documents launch, walkthrough, deterministic/local execution, and Azure-relevant runtime requirements.
- Focused tests plus full test, typecheck, build, evaluation, record, fixture/hash, architecture, and diff checks pass.

## Verification commands

```sh
node --version
npm test
npm run typecheck
npm run build
npm run eval -- wv-land-well-reconciliation
npm run validate:records
git diff --check
```

## Progress log

- 2026-09-04: Inspected the existing UI, APIs, typed flow, fixture, persistence, review lifecycle, and executor boundaries.
- 2026-09-04: Implemented and verified the fixture-backed local demo service and case workspace.

## Decision log

- 2026-09-04: Use deterministic structured local execution for the first demo so the browser is offline and repeatable; keep the provider boundary explicit for later Azure AI wiring.
- 2026-09-04: Use the existing `FileWvLandRunStore` and review lifecycle rather than adding a parallel persistence model.

## Alternatives considered

- A UI-only fixture presentation was rejected because it would not exercise the real typed flow or persistence boundary.
- Requiring a live LLM was rejected for the first demo because it would violate the offline, credential-free constraint.

## Affected files or modules

- `src/domains/wv-land/demo.ts`
- `app/api/demo/**`
- `app/page.tsx` and `app/globals.css`
- `tests/demo.test.ts`, `README.md`, and execution records

## Milestones

1. Inspect existing workflow, fixture, persistence, and UI.
2. Add local fixture-backed execution and APIs.
3. Add case workspace and review presentation.
4. Run full verification and record the result.

## Risks and open questions

- Local file persistence is not suitable for a scaled Azure deployment; the next milestone must select durable shared storage.
- Azure AI structured-output behavior must be validated against the same typed contracts before replacing the local executor.
