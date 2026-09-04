# Evaluations

Evaluations are behavioral contracts for agents and flows. They are separate
from unit tests: unit tests prove code mechanics; evaluations judge whether an
agent response preserves the business and safety rules.

## Case format

Each JSONL case has an ID, input, required text, and optional envelope:

```json
{
  "id": "title-chain-gap",
  "input": "...",
  "mustContain": ["human"],
  "expected": {
    "mustPreserve": ["gap"],
    "mustNotClaim": ["title certified"],
    "requiredEvidence": true,
    "noUnauthorizedAction": true
  }
}
```

## Suites

- `land-admin-cases.jsonl`: normal missing/conflict/calculation cases.
- `adversarial-land-admin.jsonl`: prompt injection, unauthorized filing, and
  cross-case data leakage attempts.

Run both suites with:

```sh
npm run eval -- case-synthesizer
npm run eval -- case-synthesizer evaluations/results.json
```

The default mock executor is useful for testing the harness, not for claiming
model quality. A real Foundry executor can use the same cases once credentials,
model configuration, and an approved evaluation environment exist.

The WV flagship has a separate typed suite:

```sh
npm run eval -- wv-land-well-reconciliation
npm run eval -- wv-land-well-reconciliation list
```

It reports deterministic and harness results separately from individual-agent
and flagship-flow behavioral measurements. Behavioral measurement requires an
externally supplied executor binding that declares non-empty identity,
version, and the `genuine-agent-execution` capability. Predefined, replay, or
stub executors are rejected as behavioral measurements. Without a valid
binding, behavioral cases are reported as `not-collected`; predefined outputs
never count as agent-quality measurements. This capability is a software
classification contract, not cryptographic attestation of a third-party
executor. The suite uses frozen fixture bytes and synthetic submitted case
material, so it does not require Azure credentials or live government
endpoints.

## What to add for production

Add human-reviewed golden outputs, structured JSON graders, latency/cost
measurements, retrieval-groundedness checks, and a regression threshold before
promoting a model or prompt version.
