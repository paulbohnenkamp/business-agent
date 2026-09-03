# Business Agent documentation map

## Start here

| Document | Purpose |
| --- | --- |
| [Quickstart](quickstart.md) | Install and run the offline example |
| [Architecture](architecture.md) | Explain domains, agents, skills, flows, and runtime |
| [Data model](data-model.md) | Explain cases, documents, leases, interests, and provenance |
| [Flow runtime](flow-runtime.md) | Explain handoffs, failures, audit records, and approval |
| [Evaluations](evaluations.md) | Explain test cases, graders, golden expectations, and adversarial tests |
| [Safety](safety.md) | Explain boundaries, permissions, prompt injection, and human control |
| [Deployment](deployment.md) | Map local seams to a Microsoft production shape |
| [Microsoft stack](MICROSOFT-STACK.md) | Map local seams to Azure/Microsoft services |
| [Domain catalog](land-administration-catalog.md) | Inventory the land-administration pack |
| [Domain authoring](domain-authoring.md) | Add or extend a domain |
| [Implementation status](IMPLEMENTATION.md) | State what is local, tested, or cloud-dependent |
| [Research](LAND-ADMIN-RESEARCH.md) | Explain the research behind the domain recipes |
| [pstack prompts](prompts/README.md) | Reusable build/review prompts |

## Repository layers

1. `domains/` contains business behavior and configuration.
2. `examples/` contains fictional seed records.
3. `evaluations/` contains behavioral test cases.
4. `src/` contains provider-neutral runtime mechanics and adapters.
5. `tests/` proves contracts locally.
6. `specs/`, `results/`, and `.audit/` preserve engineering decisions.

## Important distinction

Seed records are fictional business inputs. `MockExecutor` is the deterministic
fake model/agent. Foundry tests use a fake HTTP provider. None of those are
production data or a live language model.
