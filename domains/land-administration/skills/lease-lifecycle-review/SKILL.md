---
name: lease-lifecycle-review
version: 1.0.0
description: "Review lease terms, obligations, status, and upcoming lifecycle events from supplied evidence."
permitted-tools:
  - read
  - search
---

# Lease Lifecycle Review

1. Establish the lease, covered acreage, parties, effective date, term, and source snapshot.
2. Extract explicit rentals, payments, notices, drilling or production commitments, extensions, assignments, and continuation language.
3. Normalize each event into an obligation with a due condition/date, status, source, and confidence limitation.
4. Distinguish a monitoring reminder from a legal conclusion or default determination.
5. Flag upcoming events, missing instruments, stale records, conflicting dates, and jurisdiction-dependent requirements.
6. Escalate interpretation of legal effect, waiver, force majeure, termination, and default to a human reviewer.

Never mark a lease terminated, preserved, or in default solely from an extracted date.

## Output contract

Return `Lease identity`, `Lifecycle events`, `Risk signals`, `Open questions`,
and `Route`. Each event must include its trigger or due date, extracted
condition, status, and source. Route only to `continue`, `request-records`, or
`human-review`. Use `unknown` when a clause or jurisdictional rule is absent.
A calendar reminder is an operational recommendation, not a legal conclusion.
