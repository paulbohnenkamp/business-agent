---
id: assignment-transfer-review
version: 1.0.0
name: Assignment Transfer Review
description: "Review a lease or interest assignment package before a record update."
inputs:
  - assignment instrument and underlying agreement
outputs:
  - evidence comparison, requirements, and human-review route
agents:
  - intake-reviewer
  - title-chain-reviewer
  - assignment-transfer-reviewer
  - case-synthesizer
---

# Assignment Transfer Review Flow

Intake freezes the source snapshot. Title review and assignment review compare
the proposed transfer with the underlying evidence. Synthesis preserves gaps
and routes the package before any registry update, payment change, or external
communication.
