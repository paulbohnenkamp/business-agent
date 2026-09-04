---
id: 011-local-wv-demo
title: Local West Virginia flagship demo
status: completed
spec: specs/011-local-wv-demo.md
completed: 2026-09-04
---

## What changed

Implemented a browser-first case workspace for the frozen Braxton County WV
fixture. The browser invokes the real typed `wv-land-well-reconciliation`
flow, persists a structured aggregate through `FileWvLandRunStore`, and ends at
the append-only human-review boundary.

## Files changed

- Added `src/domains/wv-land/demo.ts` for validated fixture loading, explicit
  deterministic local agent execution, run persistence, and review operations.
- Added demo case/run/review APIs under `app/api/demo`.
- Replaced the starter page with a focused enterprise case workspace and
  responsive styling in `app/globals.css`.
- Added a focused integration test and documented launch, walkthrough,
  deterministic execution, and Azure runtime requirements in `README.md`.

## Deviations from the spec

The first local demo uses deterministic structured execution because no local
LLM credentials are available and the user required an offline, repeatable
demo. It preserves the provider-neutral boundary for a later Azure AI
executor. No Azure infrastructure or live source mode was added.

## Checks run and results

- `node --version`: v24.14.1
- focused demo test: passed
- `npm test`: passed, 118 tests
- `npm run typecheck`: passed
- `npm run build`: passed; existing package-lock tracing warning only
- `npm run eval -- wv-land-well-reconciliation`: passed, 14 cases with 7 deterministic/harness passes and 7 behavioral cases not collected without a genuine external executor
- fixture/hash validation: passed through the full test suite
- architecture checks: passed through the full test suite
- `git diff --check`: passed
- `npm run validate:records`: the new 011 spec/result records validate; command still reports known historical issues in records 001–004

## Remaining follow-ups

Replace the local executor with a configured Azure AI/Foundry executor and move
file-backed persistence to an Azure durable store before deployment.

## Important decisions

- Keep local structured execution deterministic and explicit so the first demo
  remains offline and repeatable.
- Reuse the existing WV persistence and review lifecycle rather than creating
  a second demo-only state model.
