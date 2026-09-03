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
  --flow parcel-transfer-review \
  --context examples/inputs/parcel-transfer.md
```

The run writes `input.md`, `run.json`, and one Markdown output per agent under
`/tmp/business-agent-run/runs/<run-id>/`. The default executor is deterministic
and offline. Microsoft Foundry execution is an adapter behind the same
boundary.

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
