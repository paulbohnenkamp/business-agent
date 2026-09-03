# Land-administration catalog

The source of truth for definitions is the Markdown under
`domains/land-administration/`. The companion `catalog.yaml` is the reviewable
inventory: it gives a business owner one place to see what the domain can do.

## Flows

| Flow | Outcome | Human gate |
| --- | --- | --- |
| `parcel-transfer-review` | Transfer assessment | title, jurisdiction, filing |
| `land-package-review` | Lease/ownership package assessment | payment, filing, communication |
| `lease-lifecycle-review` | Obligation register and timing route | legal effect, default, waiver |
| `division-order-preparation` | Calculation worksheet and exceptions | payment setup and owner communication |
| `assignment-transfer-review` | Assignment evidence comparison | registry update and payment impact |

## Agent families

- Intake and routing: `intake-reviewer`, `land-package-triage`, `case-synthesizer`
- Lease operations: `lease-obligation-reviewer`, `lease-lifecycle-reviewer`
- Title and ownership: `title-chain-reviewer`, `ownership-reviewer`, `interest-reconciliation-reviewer`
- Production readiness: `division-order-preparer`
- Jurisdictional controls: `compliance-reviewer`
- Assignment processing: `assignment-transfer-reviewer`

The catalog currently contains 11 agents, 9 skills, and 5 flows. `catalog.yaml`
is the machine-readable inventory; the Markdown files are the detailed prompts
and procedures.

## Design rule

An agent can extract, compare, calculate, summarize, and recommend. It cannot
certify title, decide legal effect, update a system of record, set up payment,
file an instrument, or contact an owner without a human-controlled boundary.
