---
name: parcel-record-analysis
version: 1.0.0
description: "Analyze parcel identifiers and record consistency for land-administration cases without making ownership or legal determinations."
---

# Parcel Record Analysis

Use this skill to establish whether parcel-related records consistently describe the same land unit.

## Procedure

1. Collect the case ID, parcel identifier, legal or situs description, map or geometry reference, record dates, and source paths.
2. Compare identifiers across the case submission, parcel record snapshot, transfer instrument, and configured authoritative sources.
3. Record exact matches, aliases, formatting differences, missing fields, stale records, and contradictions.
4. Treat an identifier mismatch as a discrepancy to investigate, not proof that records refer to different land.
5. Preserve source provenance and quote or summarize only what the record supports.
6. Return `consistent`, `incomplete`, `conflicting`, or `not-assessable`, with reasons and missing evidence.

## Boundaries

Do not infer parcel identity from an address alone, resolve boundary or survey disputes, interpret jurisdiction-specific parcel definitions, or decide ownership, title, zoning, tax, or legal status. Those questions require authoritative configuration or human review.

## Output contract

Provide a parcel record analysis with case ID, parcel ID, records inspected, comparison observations, discrepancies, unknowns, confidence limitations, and review triggers. A missing authoritative record must be reported explicitly.
