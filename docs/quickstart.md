# Business Agent quickstart

Install dependencies and inspect the land domain.

```sh
npm install
npm run cli -- domain list
npm run cli -- agent list --domain land-administration
npm run cli -- flow list --domain land-administration
```

Run the offline reference flow.

```sh
export BUSINESS_AGENT_WORKSPACE=/tmp/business-agent-run
npm run cli -- run \
  --domain land-administration \
  --flow wv-land-well-reconciliation \
  --context examples/inputs/parcel-transfer.md
```

The active catalog resolves only the Phase 5 flagship definitions. The
existing CLI runner remains the legacy Markdown runner; typed WV execution
requires a provider-neutral agent executor and is exercised offline through
test infrastructure. Microsoft Foundry integration is deferred to Phase 9.

Run the local evaluation harness:

```sh
npm run eval -- case-synthesizer
```

Start the review console:

```sh
npm run dev
```

Open `http://localhost:3000/review` after a run. Enter the run ID to approve or
reject the review packet. The local action gateway remains blocked by default.
