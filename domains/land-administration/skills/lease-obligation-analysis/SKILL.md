---
name: lease-obligation-analysis
version: 1.0.0
description: "Extract and assess lease obligations, dates, parties, and evidence without giving legal advice."
permitted-tools:
  - read
  - search
---

# Lease Obligation Analysis

1. Identify the lease, parties, acreage, effective dates, term, and source
   documents.
2. Extract rentals, expiration dates, drilling or production commitments,
   notice requirements, payment conditions, and extension provisions.
3. Attach each observation to a source and record date or version.
4. Separate stated obligations from inferred business reminders.
5. Mark missing, ambiguous, conflicting, or jurisdiction-dependent terms as
   unknown.
6. Escalate legal interpretation, default conclusions, and deadline disputes.

Return an obligation table with obligation, due condition or date, source,
confidence limitation, status, and human-review trigger.
