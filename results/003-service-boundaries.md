---
id: 003-service-boundaries
title: Establish cohesive runtime service boundaries
status: completed
spec: specs/003-service-boundaries.md
completed: 2026-08-26
---

# Service-boundaries result

`RunService` now owns run execution, prior-output handoffs, persistence, and
human-review transitions. Existing function exports remain as compatibility
facades. `FoundryClient` now owns Microsoft Responses API HTTP behavior while
the executor adapts provider output to the runtime contract. Explicit local
ports and safe defaults were added for retrieval, telemetry, and consequential
actions.

Verification passed with TypeScript type-check, 22 automated tests, and the
Next production build. No live cloud service or external side effect was used.
