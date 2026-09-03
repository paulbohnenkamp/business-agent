---
id: parcel-transfer-review
version: 1.0.0
name: Parcel Transfer Review
description: "Review and route one parcel-transfer case through intake, specialist assessment, and human-confirmed synthesis."
inputs:
  - parcel-transfer case bundle
  - parcel and ownership source records
  - jurisdictional configuration, if available
outputs:
  - synthesized parcel-transfer review packet
  - proposed administrative route requiring human confirmation
agents:
  - intake-reviewer
  - ownership-reviewer
  - compliance-reviewer
  - case-synthesizer
---

# Parcel Transfer Review Flow

## Execution graph

```text
case bundle
    |
    v
intake-reviewer
    |
    +--> ownership-reviewer --+
    |                         |
    +--> compliance-reviewer -+--> case-synthesizer --> human confirmation
```

## Steps

1. **Intake**: Run `agents/intake-reviewer.agent.md` against the case bundle. If the target case or parcel cannot be identified, stop with `failed-intake` and request clarification. If required records are missing, preserve the incomplete status and continue only when downstream review can still produce useful bounded findings.
2. **Specialist review**: After intake, run `agents/ownership-reviewer.agent.md` and `agents/compliance-reviewer.agent.md`. These steps may run in parallel. Each receives the intake assessment and must report its own failure, unknowns, provenance, and human-review triggers.
3. **Conflict preservation**: Do not discard or overwrite disagreement between source records or specialist assessments. Attach the conflicting claims and their sources to the synthesis input. A conflict that cannot be resolved from authoritative configuration routes to human review.
4. **Synthesis**: Run `agents/case-synthesizer.agent.md` only after intake and both specialist outputs are available. If an agent fails, the synthesizer must identify the missing output and cannot label the review complete.
5. **Routing**: The synthesizer proposes exactly one next administrative route. A human reviewer confirms, changes, or rejects that route before any filing, registry update, approval, denial, or communication.

## Branching and failure rules

- Missing or ambiguous case identity: stop and request clarification.
- Missing jurisdictional configuration: mark jurisdiction-dependent requirements unknown and route to jurisdictional review; do not infer local law.
- Ownership or compliance conflict: preserve both findings and route to the relevant human reviewer.
- Failed specialist: preserve the error, mark the synthesized review incomplete, and require human review.
- No external side effects: this flow only reads and writes review artifacts; it does not submit filings, contact parties, update records, or make legal determinations.

## Synthesis requirements

The final packet must include case and parcel identifiers, source snapshot, all specialist results, known facts, unknowns, conflicts, failures, proposed route, rationale, and required human confirmation. It must distinguish a proposed route from an executed administrative action.
