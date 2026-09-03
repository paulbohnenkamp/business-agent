---
name: ownership-interest-reconciliation
version: 1.0.0
description: "Compare ownership and working-interest records while preserving conflicts and payment-impacting uncertainty."
permitted-tools:
  - read
  - search
---

# Ownership Interest Reconciliation

1. Identify the asset, tract, lease, well, parties, and effective date.
2. Compare source ownership, working interest, net revenue interest, and
   division-of-interest records.
3. Preserve exact source values and calculate differences only when inputs are
   complete and units are explicit.
4. Identify missing assignments, stale records, decimal mismatches, and
   conflicting effective dates.
5. Never choose a value merely because it is the newest or most common.
6. Escalate discrepancies that could affect payments, title, or ownership.

Return a reconciliation table, source map, unresolved conflicts, and required
human review.
