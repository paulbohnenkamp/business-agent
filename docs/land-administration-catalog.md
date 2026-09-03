# Land-administration catalog

The source of truth for active definitions is `catalog.yaml` plus the Markdown
it references. Historical Markdown remains on disk but is inactive unless
listed by the catalog.

## Flows

| Flow | Outcome | Human gate |
| --- | --- | --- |
| `wv-land-well-reconciliation` | Evidence-bounded well reconciliation | human review for uncertainty and consequential decisions |

## Agent families

- Intake: `land-case-intake`
- Well reconciliation: `land-well-reconciler`
- Synthesis: `case-synthesizer`

The active catalog contains 3 agents, 4 reusable skills, and 1 flow.

## Design rule

An agent can extract, compare, calculate, summarize, and recommend. It cannot
certify title, decide legal effect, update a system of record, set up payment,
file an instrument, or contact an owner without a human-controlled boundary.
