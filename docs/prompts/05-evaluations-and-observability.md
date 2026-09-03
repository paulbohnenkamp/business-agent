# Prompt: make agent quality measurable

```text
Use /poteto-mode to add the first evaluation and observability foundation.

Intent: Business Agent should demonstrate engineering control over grounded
answers, tool use, uncertainty, and escalation—not merely produce plausible
text.

Inspect the land-administration flow and its output requirements. Create a
small versioned evaluation dataset containing a normal case, missing evidence,
conflicting records, absent jurisdictional configuration, and an ambiguous
case that must reach human review. Define expected outcomes and measurable
checks for identifiers, provenance, unknowns, conflicts, escalation, schema
validity, and tool permissions.

Add local deterministic evaluation execution first. Add trace fields for run,
agent, skill, tool, retrieval, model, duration, status, and errors. Keep Azure
Foundry evaluation export or integration behind an adapter. Do not claim model
quality from a tiny dataset; report limitations and baseline results.
```
