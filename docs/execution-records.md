# Execution records

Business Agent tracks planned and completed work as paired repository records.

## Directories and lifecycle

- `specs/<slug>.md` contains a proposed or approved implementation spec.
- `results/<slug>.md` records completed work for the matching spec.
- A spec moves through `proposed`, `approved`, `in-progress`, and `completed`.
- The original spec remains in `specs/` after completion.
- A result is created only after the spec's acceptance criteria and verification
  commands pass.

## Spec requirements

Every spec includes goal and non-goals, current-state findings, chosen approach,
alternatives considered, affected files or modules, milestones, acceptance
criteria, verification commands, risks and open questions, a progress log, and
a decision log.

## Result requirements

Every result includes what changed, files changed, checks and results,
deviations from the spec, important decisions, and remaining follow-ups. Its
front matter points back to the source spec.

## Naming and metadata

The filename slug and `id` must match exactly between the spec and result. A
spec's `result` field must point to `results/<same-slug>.md`; a result's `spec`
field must point to `specs/<same-slug>.md`.

Specs use this front matter:

```yaml
---
id: example
title: Example feature
status: proposed
created: 2026-01-01
updated: 2026-01-01
result: results/example.md
---
```

Results use the same `id` and `title`, plus `status: completed`, `spec`, and
`completed`.

Run `npm run validate:records` to check the convention.
