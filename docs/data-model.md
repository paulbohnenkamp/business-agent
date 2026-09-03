# Data model and provenance

Business Agent is intentionally document- and configuration-first. The
runtime does not pretend to be a land accounting system. It creates reviewable
packets from supplied evidence.

## Core records

| Record | Meaning | Minimum controls |
| --- | --- | --- |
| Case | One requested business review | stable ID and source snapshot |
| Document | Source evidence or attachment | path, version, locator |
| Party | Person, entity, operator, or owner | identity ambiguity preserved |
| Parcel/tract | Land area being reviewed | legal description and acreage |
| Lease/agreement | Contract covering land or interests | effective dates and source |
| Obligation | Payment, notice, rental, production, or other event | condition/date/status/source |
| Interest | Mineral, royalty, ORRI, working, or ownership share | fraction, effective date, evidence |
| Unit/well | Production area used for interest review | unit scope and acreage |
| Review | Agent findings and route | provenance, unknowns, conflicts |

Assignment and transfer cases connect a proposed instrument to the underlying
lease/agreement, parties, tract, and interest. The review result is a proposed
record update with requirements—not a registry mutation.

## Evidence rule

Every material finding should be traceable to a document or supplied record.
If evidence is absent, the output says `unknown`, `missing`, or
`not-assessable`; it does not fill the gap from a typical industry pattern.

## Seed data

The files in `examples/land-records/` are synthetic. They deliberately show a
small connected graph: lease `L-2001`, tract `T-17`, obligations, owner `P-100`,
unit `UNIT-7`, and division order `DO-77`. They are safe fixtures for tests and
demonstrations, not legal documents.
