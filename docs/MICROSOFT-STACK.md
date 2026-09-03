# Microsoft implementation path

The runtime remains provider-neutral and works offline with its deterministic
executor. The Microsoft adapter is the intended production integration path,
but remains an explicit, credentialed adapter seam in this reference repo.

- Microsoft Foundry provides model and agent execution.
- Azure AI Search provides grounded retrieval over enterprise documents.
- Azure Blob Storage stores source documents.
- Microsoft Entra ID provides identity and access control.
- Application Insights and Azure Monitor provide traces and operational data.
- MCP exposes approved tools through a standard protocol.
- Teams or Copilot Studio can become a supervised user surface.

The repository should prove each adapter with a local fake before requiring an
Azure subscription. Read-only tools come before write tools. Human approval is
required before consequential actions.
