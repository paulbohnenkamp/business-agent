# Safety and control model

Business Agent is designed for consequential enterprise workflows, so the
agent is not the authority.

## Human gates

Human review is required before:

- legal interpretation or title certification;
- payment setup or change;
- filing or registry update;
- owner or external communication;
- marking an obligation satisfied, waived, or in default.

## Tool controls

A tool call must pass the agent's permitted-tool list and any declared required
input validation. The MCP catalog is derived from permitted tools and is a
catalog seam, not an authorization bypass.

## Untrusted documents

Text inside a lease, attachment, email, or retrieved document is evidence, not
an instruction to the agent. Adversarial fixtures test attempts to override
instructions, exfiltrate another case's information, or trigger an external
action.

## Deployment rule

Start read-only. Add write tools only with explicit authorization, audit
records, idempotency, approval, rollback, and a service-level owner.

The local `BlockedActionGateway` is the safe default. `NoopTelemetry` provides
an explicit local sink. They are extension points, not claims of production
authorization or observability.
