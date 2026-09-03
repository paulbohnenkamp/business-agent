# Flow runtime

## Execution sequence

The current runner executes declared agents in order. After each successful
agent, it appends that output to the working context for the next agent and
writes the output to the run directory.

```text
source snapshot → intake → specialist handoffs → synthesis → human review
```

The Markdown flow describes intended responsibilities and branches. The
TypeScript runner currently provides ordered execution; it does not yet infer
parallel branches from prose or execute them concurrently.

## Run record

Each run contains:

- `input.md`: original context;
- `run.json`: domain, flow/version, status, review status, errors, outputs, and handoffs;
- `agents/<agent-id>.md`: each agent result.

## Review lifecycle

Completed runs begin as `pending-human-review`. A human-controlled caller may
transition the run to `approved` or `rejected`. Approval does not itself issue
a payment, file a document, change a registry, or contact an owner.

## Failure behavior

An agent failure stops the flow, records the error, and leaves the run
`failed`. Partial outputs remain available for diagnosis. The system must not
silently convert a failed or incomplete run into an approval.
