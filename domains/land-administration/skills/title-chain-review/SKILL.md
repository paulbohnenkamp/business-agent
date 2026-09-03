---
name: title-chain-review
version: 1.0.0
description: "Trace ownership evidence and identify breaks, conflicts, and missing curative documents."
permitted-tools:
  - read
  - search
---

# Title Chain Review

1. Build a dated chain from the supplied deeds, assignments, probate or entity records, and title opinions.
2. Record grantor, grantee, interest, effective/recording dates, legal description, and source for every link.
3. Compare legal descriptions and interest fractions; do not silently repair discrepancies.
4. Identify gaps, conflicting instruments, unrecorded claims, missing authority, and jurisdiction-specific filing needs.
5. Produce a proposed ownership view with unresolved requirements and a human-review route.

The result is an evidence map, not a certification of title.

## Output contract

Return a dated chain table with `document`, `grantor`, `grantee`, `interest`,
`legal-description-match`, `effective-date`, `recording-date`, and `source`.
Then return `Chain status`, `Requirements`, `Proposed ownership view`, and
`Route`. Do not fill gaps from typical inheritance, marital, entity, or
recording patterns; those are hypotheses requiring evidence and jurisdictional
review.
