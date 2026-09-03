---
id: land-administration
version: 1.1.0
name: Land Administration
description: "Review and route land, lease, ownership, and production-interest cases with evidence and human control."
---

# Land Administration

## Purpose

The active Phase 5 workflow supports evidence-bounded reconciliation of a
submitted synthetic well case with independent normalized public evidence.
Historical lease, transfer, ownership, and division-order definitions remain
on disk but are inactive. This is not legal or accounting advice.

## Vocabulary

- **Case**: the submitted request and its supporting records.
- **Parcel**: the land unit identified by a parcel identifier and related location or record data.
- **Transfer**: a proposed change in the recorded interest or ownership of a parcel.
- **Ownership evidence**: records supporting the identity, authority, and interest of parties to a transfer.
- **Compliance finding**: a documented comparison against configured requirements, with provenance and uncertainty recorded.
- **Jurisdictional configuration**: the local rules, forms, deadlines, authorities, and review thresholds supplied for a case.
- **Routing decision**: the next administrative path, such as request clarification, human legal or jurisdictional review, or continued processing.
- **Lease record**: the structured record for a lease, amendment, assignment, term, and covered acreage.
- **Obligation**: a payment, notice, drilling, production, rental, or other contract-derived event that must be monitored.
- **Interest**: an ownership or economic share, such as mineral, royalty, overriding royalty, or working interest.
- **Division order**: a production-payment record that states an owner's interest in a well or unit and requires evidence-backed review.
- **Source snapshot**: the immutable set of documents and records used for one review.

## Source of truth and boundaries

Case submissions, parcel records, ownership documents, configured jurisdictional requirements, and cited authoritative sources are the sources of truth. Every finding must identify its source or be marked unknown.

This domain does not assume any jurisdiction-specific law, regulation, filing requirement, fee, deadline, tax treatment, zoning rule, or approval authority. Missing or conflicting jurisdictional configuration requires human review or clarification. The agents do not make legal determinations, transfer title, update a registry, contact parties, or submit filings.

## Reference data model

The minimum connected records are `case`, `parcel`, `lease`, `document`, `party`, `interest`, `obligation`, `unit`, and `review`. Records should use stable IDs and retain effective dates, source references, and status history. A calculated interest is a proposal until a qualified reviewer accepts the evidence.

The reference fixtures in `examples/land-records/` intentionally use fictional IDs and values. They demonstrate relationships, not jurisdictional truth.

## Workflows

`wv-land-well-reconciliation` runs intake, bounded well reconciliation, and
case synthesis. Findings are transient in Phase 5; persistence and review
lifecycle belong to Phase 6.

The workflow accepts a case bundle and produces an auditable review packet. Intake establishes scope and record completeness. Ownership verification and compliance review then run from the intake result and may proceed in parallel. A case synthesizer preserves specialist findings and conflicts, identifies uncertainty, and recommends the next administrative route for human confirmation.

## Common artifact expectations

Each artifact should preserve:

- case and parcel identifiers;
- source paths, record dates, and provenance where available;
- known facts, unknowns, assumptions, and conflicts;
- explicit failure status when required evidence is unavailable;
- human-review requirements and the reason for escalation.
