---
id: 012-case-conversation
title: Case-scoped Ask Business Agent conversation
status: completed
created: 2026-09-04
updated: 2026-09-04
result: results/012-case-conversation.md
---

## Goal

Add a lightweight Ask Business Agent conversation surface over the existing WV case workspace. Answers must be derived from the current structured case/run state, preserve evidence conflicts and unknowns, and remain behind the same human-review boundary.

## Non-goals

- Chatbot-first redesign, general memory, RAG framework, conversation DAG, plugin system, or new agent framework.
- Azure credentials, Foundry wiring, deployment, live sources, Ohio/Pennsylvania, or portability refactoring.
- Autonomous filing, payment, registry, email, title, or ownership actions.

## Current-state findings

- The local workspace invokes and persists the typed WV flow through `FileWvLandRunStore`.
- The aggregate contains structured findings, conflicts, unknowns, synthesis, evidence, snapshots, and provenance.
- The current Foundry adapter returns prose through the generic agent executor and does not define structured case conversation output.
- The browser has no conversation API or panel.

## Chosen approach

Define a small provider-neutral `CaseConversationPort` with a structured response containing an answer, topic, grounded evidence/finding/conflict/unknown references, and safety metadata. Implement a deterministic WV reference responder over the persisted aggregate plus explicit production state. Accept a deliberately small history of typed turns for follow-up resolution. Add one API route and a restrained Ask Business Agent panel to the existing workspace.

## Alternatives considered

- Scraping the rendered page was rejected because structured case state is the source of truth.
- Reusing the prose Foundry agent executor was rejected because conversation needs controlled state input and evidence-linked structured output.
- General memory or RAG infrastructure was rejected because the demo needs only case-scoped follow-up context.

## Affected files or modules

- `src/core/case-conversation.ts`
- `src/domains/wv-land/conversation.ts` and demo integration
- `app/api/demo/runs/[runId]/conversation/route.ts` and `app/page.tsx`
- focused conversation/API tests, README, and execution records

## Milestones

1. Define the provider-neutral conversation contract.
2. Implement deterministic WV responses and acceptance tests, including reported-zero control.
3. Add API and lightweight workspace panel.
4. Document Foundry replacement seams and run full verification.

## Acceptance criteria

- All seven required questions answer from current case/run state and remain evidence-grounded.
- Operator disagreement retains both WVDEP and WVGES claims and references.
- Follow-up evidence question resolves the prior operator topic.
- No-match production and reported-zero production remain semantically distinct.
- Unknowns, mineral-title limits, consequential-action limits, and case isolation are enforced.
- Conversation responses are deterministic, structured, and provider-neutral.
- API tests prove case/run → conversation API → case service → structured response.
- Existing workspace remains intact and README documents the conversational demo.

## Verification commands

```sh
node --version
node --import tsx --test tests/conversation.test.ts
npm test
npm run typecheck
npm run build
npm run eval -- wv-land-well-reconciliation
npm run validate:records
git diff --check
```

## Risks and open questions

- A future Foundry implementation must constrain the state projection and validate every returned reference before presentation.
- Local file-backed persistence remains a pre-Azure deployment concern documented by the prior milestone.

## Progress log

- 2026-09-04: Inspected the completed local demo and existing Foundry adapter.
- 2026-09-04: Implemented and verified the case-scoped conversation contract and deterministic responder.

## Decision log

- 2026-09-04: Keep conversation state to the current case/run and a small typed turn history; do not add generalized memory.
- 2026-09-04: Keep the deterministic implementation explicit as a reference/demo responder, not an LLM claim.
