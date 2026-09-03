---
id: 002-platform-completion
title: Complete the local enterprise-agent platform foundation
status: completed
created: 2026-08-26
updated: 2026-08-26
result: results/002-platform-completion.md
---

## Goal

Make the Business Agent reference repository understandable, testable, and
honest across documentation, configuration, runtime, evaluations, seed data,
tools, MCP, retrieval, human review, and Microsoft Foundry integration.

## Non-goals

No live Azure provisioning, production credentials, network MCP server,
production payment/filing side effects, or legal/title certification.

## Acceptance criteria

- Documentation describes current behavior and explicit future seams.
- Seed business records are coherent and tested.
- Flows hand off prior outputs and record audit paths.
- Runs expose explicit human-review states and transitions.
- Evals support required content, preservation, forbidden claims, evidence,
  routing, summaries, and adversarial cases.
- Local retrieval includes provenance.
- Tools validate permissions and required inputs.
- MCP and Foundry adapter contracts have offline tests.
- TypeScript, tests, and production build pass.

## Verification commands

```sh
npm run typecheck
npm test
npm run build
```

## Decision log

- Keep business behavior in Markdown/YAML and mechanics in TypeScript.
- Keep the deterministic executor as the offline fake model.
- Treat seed records, fake model output, and fake provider responses as three
  separate test layers.
- Preserve cloud integrations behind explicit adapters and credentials.
