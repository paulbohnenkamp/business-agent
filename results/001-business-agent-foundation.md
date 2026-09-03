---
id: 001-business-agent-foundation
title: Business Agent foundation
status: completed
spec: specs/001-business-agent-foundation.md
completed: 2026-08-26
---

# Business Agent foundation result

The job-review product path was removed from source, tests, and user-facing
documentation. The land-administration domain remains the reference example.

The runtime now includes skill loading, permissioned typed tools, an MCP catalog,
a Microsoft Foundry executor boundary, local evaluation structures, pstack
prompts, and a decision trail.

Verification passed with `tsc --noEmit`, 10 tests, and `npm run build`. The live
CLI was inconclusive in this sandbox because `tsx` could not create its IPC pipe.
