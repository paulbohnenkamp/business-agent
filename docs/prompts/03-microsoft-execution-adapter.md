# Prompt: add Microsoft execution behind the boundary

```text
Use /poteto-mode to implement one bounded Microsoft execution slice for
Business Agent.

Intent: execute the existing land-administration flow with Microsoft Foundry
using TypeScript, without changing the domain Markdown contract or making the
application depend on a cloud account for unit tests.

First inspect the current AgentExecutor boundary and the official Microsoft
TypeScript SDK/API guidance. Choose the smallest supported integration path.
Keep a deterministic fake executor for tests and local development. Use
environment-based authentication and never commit credentials. Add typed
configuration, clear startup errors, timeout handling, and tests for provider
selection and failure behavior.

Do not add Azure AI Search, MCP, Teams, or autonomous side effects in this
slice. Do not rewrite the orchestrator. Verify typecheck, tests, and the local
offline flow. Report exactly what was proven and what still requires Azure.
```
