# Azure Demo A

Demo A hosts the existing deterministic Business Agent demo. It does not
replace the local/demo agents with Foundry agents and does not add a new
product workflow.

## Recommended target

- Azure App Service for Linux Web App
- One App Service plan in `westus2`
- B1 Linux tier (1 vCPU, 1.75 GB RAM, 10 GB App Service storage)
- Built-in Node.js `24-lts` runtime
- No container registry, Kubernetes cluster, database, or Foundry model
  deployment

App Service is the smallest managed Azure host that can run the existing
Next.js `next start` process with the current Node runtime. The existing
Dockerfile remains a fallback if the platform runtime changes, but Demo A
does not require an ACR or container deployment.

## Persistence boundary

The demo currently persists runs, findings, conversations, and review
decisions through `FileWvLandRunStore` under `BUSINESS_AGENT_WORKSPACE`.
Configure that variable to `/home/data/business-agent-demo` and keep the app
at one instance. This preserves the current behavior for a portfolio demo,
but the data is not a durable backup: App Service restarts, redeployments,
instance replacement, or scaling can lose or isolate local run files.

Frozen WV fixtures remain packaged in the repository and are read-only
application inputs, so deterministic evidence and the seven tested chat
behaviors do not depend on the writable workspace.

Durable multi-instance persistence is deliberately deferred. A later milestone
can add a small Blob or database-backed store behind the existing store port if
the demo needs durable shared state.

## Configuration

Set these App Service application settings:

```text
NODE_ENV=production
BUSINESS_AGENT_WORKSPACE=/home/data/business-agent-demo
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Do not set `BUSINESS_AGENT_DOMAINS_ROOT` for Demo A; the frozen fixtures are
packaged with the application.

## Deployment, after approval

The commands below are intentionally not run by the readiness milestone.
Choose a globally unique web-app name before running them.

```bash
az group create \
  --name rg-business-agent-demo \
  --location westus2

az appservice plan create \
  --name asp-business-agent-demo \
  --resource-group rg-business-agent-demo \
  --location westus2 \
  --is-linux \
  --sku B1

az webapp create \
  --name <globally-unique-business-agent-name> \
  --resource-group rg-business-agent-demo \
  --plan asp-business-agent-demo \
  --runtime 'NODE|24-lts'

az webapp config appsettings set \
  --name <globally-unique-business-agent-name> \
  --resource-group rg-business-agent-demo \
  --settings NODE_ENV=production \
             BUSINESS_AGENT_WORKSPACE=/home/data/business-agent-demo \
             SCM_DO_BUILD_DURING_DEPLOYMENT=true

az webapp config set \
  --name <globally-unique-business-agent-name> \
  --resource-group rg-business-agent-demo \
  --startup-file 'npm run start'

az webapp deployment source config-zip \
  --name <globally-unique-business-agent-name> \
  --resource-group rg-business-agent-demo \
  --src <deployment-zip>
```

For the first deployment, create the zip from a clean checkout while excluding
`.git`, `node_modules`, `.next`, and local workspaces. Verify the app with the
home page and the demo-case API, then exercise run, conversation, and review
flows. Do not put secrets in the repository or deployment archive.

## Cost and approval

The B1 App Service plan is the only continuously billed resource proposed for
Demo A. Microsoft currently lists the Linux B1 pay-as-you-go reference price as
about `$13.14/month`; actual billing depends on subscription offer, region,
tax, and runtime. The Web App itself is included in the plan. No storage
account is required for the initial single-instance persistence choice.

Required approval before execution:

1. Create resource group `rg-business-agent-demo` in `westus2`.
2. Create Linux App Service plan `asp-business-agent-demo` at B1.
3. Create one Node `24-lts` Web App with a globally unique name supplied at
   deployment time.

