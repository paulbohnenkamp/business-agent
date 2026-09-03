---
id: division-order-preparation
version: 1.0.0
name: Division Order Preparation
description: "Reconcile ownership evidence and draft a production-interest record for approval."
inputs:
  - lease, title, unit, ownership, and proposed division-order records
outputs:
  - calculation worksheet, exceptions, and human approval route
agents:
  - intake-reviewer
  - title-chain-reviewer
  - division-order-preparer
  - interest-reconciliation-reviewer
  - case-synthesizer
---

# Division Order Preparation Flow

Intake freezes the source snapshot. Title and interest reviewers establish the
evidence and conflicts. The preparer calculates only when inputs support the
formula. No payment record or owner communication is issued automatically.

## Stage contract

1. `intake-reviewer` identifies the well/unit, tract, owner, source snapshot, and missing records.
2. `title-chain-reviewer` produces the dated evidence chain and requirements.
3. `interest-reconciliation-reviewer` compares competing fractions and effective dates.
4. `division-order-preparer` shows the calculation, proposed value, and exceptions.
5. `case-synthesizer` routes the draft to human approval or requests more evidence.

The terminal output is a review packet. It is not a payment instruction,
division-order issuance, title opinion, or owner communication.
