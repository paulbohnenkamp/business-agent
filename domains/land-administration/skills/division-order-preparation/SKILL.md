---
name: division-order-preparation
version: 1.0.0
description: "Prepare an evidence-backed draft of production interests and route discrepancies for human approval."
permitted-tools:
  - read
  - search
  - calculate
---

# Division Order Preparation

1. Confirm the well/unit, tract acreage, total unit acreage, interest owner, interest type, and effective date.
2. Link the proposed decimal to the lease royalty, ownership fraction, unit participation, and source documents.
3. Recalculate simple royalty interest as `(net mineral acres / unit acres) * royalty rate` when the supplied facts support that formula.
4. Compare the calculated result with the proposed division-of-interest record and preserve both values.
5. Flag partial-unit allocation, NPRI/ORRI, working-interest, amendments, title requirements, rounding, or missing data as exceptions.
6. Produce a draft only. Human approval is required before issuing, changing payment instructions, or communicating with an owner.

## Output contract

Return `Inputs and sources`, `Calculation`, `Comparison`, `Exceptions`, and
`Approval route`. Show the exact formula and unrounded intermediate values when
possible. Preserve the proposed decimal even when it differs from the simple
calculation. Route to `human-review` for title requirements, conflicting
effective dates, non-simple interest types, missing evidence, or any payment
impact. Never present a draft as an approved division order.
