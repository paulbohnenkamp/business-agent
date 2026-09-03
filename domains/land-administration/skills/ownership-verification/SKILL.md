---
name: ownership-verification
version: 1.0.0
description: "Verify the consistency and provenance of party and ownership evidence for a parcel transfer without certifying title."
---

# Ownership Verification

Use this skill to organize evidence about parties, recorded interests, and authority in a parcel-transfer case.

## Procedure

1. Identify each party and the role stated in the source records.
2. Map names, entity identifiers, capacities, signatures, dates, stated interests, and authority documents to their exact sources.
3. Compare those attributes across the transfer instrument, parcel record, ownership records, and supplied jurisdictional configuration.
4. Record matches, discrepancies, absent evidence, unreadable evidence, and conflicting source claims separately.
5. Apply configured requirements only when their jurisdiction, version, and authority are supplied.
6. Classify the evidence as `consistent`, `incomplete`, `conflicting`, or `not-assessable`.
7. Escalate title validity, legal effect, authority interpretation, and unresolved conflicts for human review.

## Boundaries

Do not certify ownership or title, infer identity or authority from similarity alone, decide whether signatures are legally sufficient, or fill gaps from general knowledge. Do not contact parties or alter land records.

## Output contract

Provide an ownership evidence map with party, role, source, supported observation, discrepancy, unknown, and human-review trigger fields. Preserve all material conflicts for synthesis.
