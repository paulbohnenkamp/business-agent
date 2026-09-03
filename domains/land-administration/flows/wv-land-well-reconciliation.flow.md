---
id: wv-land-well-reconciliation
version: 1.0.0
name: WV Land Well Reconciliation
description: "Reconcile one submitted synthetic land case with independent normalized public evidence."
inputs:
  - typed WV land flow input
outputs:
  - transient typed WV land flow result
agents:
  - land-case-intake
  - land-well-reconciler
  - case-synthesizer
---

# WV Land Well Reconciliation Flow

Run the required steps in order: intake, reconciliation, and synthesis.
Normalized evidence and Phase 4 deterministic results enter before judgment.
Each structured result is validated before it becomes the next artifact.

Required-step execution failures remain failures, block dependent steps, and
prevent successful completion. A successfully executed judgment may instead
produce an unknown, conflict, or inconclusive finding. WVDEP and WVGES
evidence remains independent. Phase 5 returns transient structured output and
does not persist findings or execute consequential actions.
