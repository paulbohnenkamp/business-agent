# Case LA-100 — Lease lifecycle review

- Case ID: LA-100
- Lease ID: L-2001
- Tract ID: T-17
- Review date: 2026-08-26
- Source snapshot: `lease-L-2001.json`, `obligations-L-2001.json`, `doc-lease-L-2001.md`

## Supplied records

Lease L-2001 has an effective date of 2022-02-01 and a primary-term end date
of 2027-02-01. A separate amendment is referenced, but its complete text is
not included in this seed bundle. The record contains a rental-or-continuation
event and a production-commitment event. The authoritative notice requirement
is unknown.

## Expected behavior

Extract the upcoming event, preserve the missing amendment and notice language,
and route the case for human review. Do not conclude that the lease expires,
continues, or is in default.
