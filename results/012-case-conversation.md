---
id: 012-case-conversation
title: Case-scoped Ask Business Agent conversation
status: completed
spec: specs/012-case-conversation.md
completed: 2026-09-04
---

## What changed

Added a provider-neutral `CaseConversationPort` and structured response
contract. Added `WvLocalConversation`, a deterministic reference responder that
answers a bounded set of case questions from the persisted WV aggregate and
explicit production state. Added the conversation API and Ask Business Agent
panel to the existing workspace.

## Files changed

- `src/core/case-conversation.ts`
- `src/domains/wv-land/conversation.ts`
- `src/domains/wv-land/demo.ts`
- `app/api/demo/runs/[runId]/conversation/route.ts`
- `app/page.tsx`, `app/globals.css`, and `README.md`
- `tests/conversation.test.ts`
- `specs/012-case-conversation.md`

## Checks run and results

- focused conversation acceptance tests: passed, 2 tests
- `npm test`: passed, 120 tests
- `npm run typecheck`: passed
- `npm run build`: passed; existing package-lock tracing warning only
- `npm run eval -- wv-land-well-reconciliation`: passed, 14 cases; 7 deterministic/harness passes and 7 behavioral cases not collected without a genuine external executor
- fixture/hash validation and architecture checks: passed through the full suite
- `git diff --check`: passed
- new 012 records validate; repository record command retains known historical issues in records 001–004

## Deviations from the spec

The local implementation is intentionally deterministic rather than LLM-backed.
It is a reference implementation over structured state, not a claim of model
execution. No Azure credentials, Foundry wiring, or deployment were added.

## Important decisions

- Conversation history contains only a small typed list of prior question/topic
  turns and is scoped to the route's case/run identity.
- Answers return only references found in the current aggregate's evidence,
  findings, conflicts, and unknowns.
- The existing `FoundryClient` remains unchanged. A future implementation can
  implement the same `CaseConversationPort` by sending a controlled projection
  of the aggregate, production state, and typed turn history to Foundry, then
  validating structured output and every returned reference before display.
  The model must not receive unrestricted filesystem or database access.

## Remaining follow-ups

Implement the Foundry-backed conversation adapter and durable Azure persistence
as the next milestone. Reuse the same acceptance tests against that adapter.
