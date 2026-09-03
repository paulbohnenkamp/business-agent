---
id: 003-service-boundaries
title: Establish cohesive runtime service boundaries
status: completed
created: 2026-08-26
updated: 2026-08-26
result: results/003-service-boundaries.md
---

## Goal

Prevent functional modules from becoming unstructured by introducing explicit
services for stateful run lifecycle and Microsoft provider concerns, while
keeping transformations functional.

## Acceptance criteria

- `RunService` owns execution, handoffs, persistence, and review transitions.
- `FoundryClient` owns Responses API request/response behavior.
- Safe ports exist for retrieval, telemetry, and consequential actions.
- Tests cover the new boundaries and all existing behavior remains green.
- Documentation and contributor conventions explain when to use functions or
  classes.

## Non-goals

No live cloud calls, external side effects, or broad class hierarchy.

## Verification commands

```sh
npm run typecheck
npm test
npm run build
```
