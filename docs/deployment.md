# Deployment and service integration

The repository is deployable as a Next.js application or container, but the
default workflow remains a local reference implementation.

## Local verification

```sh
npm ci
npm run typecheck
npm test
npm run build
docker build -t business-agent .
```

## Microsoft target shape

| Concern | Target service | Current repository seam |
| --- | --- | --- |
| Model execution | Microsoft Foundry | `FoundryClient` |
| Grounding | Azure AI Search | `AzureSearchRetriever` |
| Source files | Azure Blob Storage | retrieval/provider boundary |
| Identity | Microsoft Entra ID | `Identity` and security helpers |
| Secrets | Azure Key Vault | environment configuration boundary |
| Telemetry | Application Insights/OpenTelemetry | `TelemetrySink` and `RunTelemetry` |
| Delivery | Teams/Copilot Studio/web app | Next.js surface and API boundary |
| Tools | MCP server or approved internal APIs | MCP handler and tool registry |

No cloud resource, credential, or external write is created by this repository.
Production deployment still needs tenant isolation, managed identity, network
policy, secret rotation, data retention, backup, and an operational owner.
