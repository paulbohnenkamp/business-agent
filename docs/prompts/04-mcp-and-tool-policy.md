# Prompt: add tools and MCP deliberately

```text
Use /poteto-mode to design and implement the smallest useful tool/MCP slice.

Intent: Business Agent must expose narrow, typed, auditable tools to agents.
The first land-administration tools should be read-only: retrieve supplied
evidence and validate required records. Tools must be selected through an
explicit permission policy, not discovered as unrestricted functions.

Inspect existing permitted-tools metadata and the AgentExecutor boundary.
Define the tool contract, input/output schemas, error model, provenance fields,
and permission checks. Implement one local tool and expose the same contract
through an MCP adapter only if the repository can test it without external
services.

Do not add write tools, registry updates, filing submission, messaging, or
general-purpose computer access. Test denied tools, malformed inputs, missing
evidence, and successful provenance-preserving calls. Keep the domain files
readable and provider-neutral.
```
