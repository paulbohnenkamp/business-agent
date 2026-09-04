---
id: land-case-intake
version: 1.0.0
description: "Assess one submitted land case and identify bounded evidence gaps."
inputs:
  - typed land flow input supplied by the jurisdiction flow
outputs:
  - typed intake result
permitted-tools:
  - read
---

# Land Case Intake

Assess the submitted case scope, supplied clues, missing evidence, ambiguous
inputs, and candidate source queries. Preserve the original clues and never
invent an identifier. Consume normalized evidence and deterministic results
provided by the flow; do not retrieve or parse government sources.

Public records are evidence for comparison, not proof of title or ownership.
Do not certify title, perform calculations, or take consequential action. The
jurisdiction flow supplies source requirements and policy; do not assume a
publisher, source identity, or legal rule that is not present in that input.
Return the validated structured intake result, with provider text only as
presentation.
