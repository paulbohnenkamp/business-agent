---
id: lease-lifecycle-review
version: 1.0.0
name: Lease Lifecycle Review
description: "Extract lease obligations and route timing, evidence, and legal-risk exceptions."
inputs:
  - lease record and supporting instruments
outputs:
  - obligation register and human-review route
agents:
  - intake-reviewer
  - lease-lifecycle-reviewer
  - case-synthesizer
---

# Lease Lifecycle Review Flow

Intake establishes the source snapshot. The lifecycle reviewer extracts events
and obligations. The synthesizer preserves evidence gaps and routes legal,
payment, deadline, or conflicting-record decisions to a human.

## Stage contract

1. `intake-reviewer` records the case ID, lease ID, source snapshot, and missing inputs.
2. `lease-lifecycle-reviewer` returns one evidence-backed row per obligation or event.
3. `case-synthesizer` keeps the specialist output intact, labels conflicts, and selects `continue`, `request-records`, or `human-review`.

The flow may create reminders only after a human accepts the proposed event and
the configured jurisdictional calendar is available.
