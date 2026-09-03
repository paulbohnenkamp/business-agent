# Business Agent instructions

- Use `/plan` for multi-step work; explore and discuss before modifying code.
- Write or update a spec in `specs/` only after agreement.
- Implement only an approved spec.
- Keep progress and decision logs in the active spec.
- Run the verification commands in the spec before declaring completion.
- Create the matching result in `results/` when completion criteria pass.

See [docs/execution-records.md](docs/execution-records.md) for the full
specification and result-record workflow.

## Runtime and dependency compatibility

- Treat the installed Omarchy-supported runtime as the compatibility baseline;
  verify it with `node --version` rather than assuming that `latest` is safe.
- Prefer the newest framework and tooling versions that pass the repository's
  verification on the current Omarchy environment.
- Pin exact dependency versions in `package.json` and commit the lockfile.
- Do not upgrade a major runtime, framework, or compiler version solely because
  a newer release exists; check engine requirements and run typechecking and
  tests first.

## TypeScript architecture conventions

- Prefer a functional core for parsing, validation, calculations, grading, and
  other transformations of explicit inputs to outputs.
- Use a small class or application service when behavior owns state, injected
  dependencies, persistence, an external client, or a lifecycle transition.
- Keep modules cohesive and named for one responsibility. Do not scatter
  unrelated helpers into generic `utils` files.
- Prefer interfaces and composition over inheritance. Avoid deep class trees,
  static global state, and hidden dependencies.
- Keep business behavior in Markdown/YAML domain artifacts. Keep core
  abstractions and orchestration domain-neutral. Add reusable mechanics to the
  core/runtime, and put deterministic domain-specific infrastructure outside
  core when it implements those abstractions. For example,
  `src/sources/west-virginia/WvdepWellSourceAdapter` may implement the reusable
  `SourceAdapter` port without adding WV-specific concepts to `src/core`.
- Treat `RunService`, `FoundryClient`, retrieval providers, tool registries,
  approval services, and telemetry adapters as explicit boundaries.
- Add a deterministic fake or contract test before adding a cloud or external
  dependency.

## West Virginia flagship

Before modifying the land domain, West Virginia source integrations, evidence
model, findings, or flagship flow, read:

- [WV land architecture](docs/WV_LAND_ARCHITECTURE.md)
- [WV land implementation plan](docs/WV_LAND_IMPLEMENTATION_PLAN.md)

Agents own bounded evidence-based judgments. Skills own reusable procedures.
Flows own sequencing and branching. Deterministic TypeScript services and tools
own source access, parsing, normalization, identifiers, arithmetic, hashing,
dates, and other exact operations.

`Finding` is structured business state. Markdown is presentation. Raw
public-source snapshots are immutable evidence. WVDEP and WVGES remain
independent evidence sources, and disagreements must not be silently collapsed.
Live government endpoints must never be required for deterministic tests or
evaluations. Public well and regulatory evidence must not be represented as
proof of title. Human approval remains required before consequential actions.
