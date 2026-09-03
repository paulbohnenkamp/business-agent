# Running Business Agent

The project uses Node.js and TypeScript. Set `BUSINESS_AGENT_WORKSPACE` to the
directory where run artifacts should be written. Set
`BUSINESS_AGENT_DOMAINS_ROOT` only when using a different domain-pack root.

```sh
npm run typecheck
npm test
npm run build
```

The CLI supports domain listing, agent and flow discovery, offline flow runs,
and run inspection. It has no external side effects.

The Next.js surface provides `/api/catalog`, `/api/review`, and `/review` for a
small local demonstration. The review endpoint changes only the stored review
status; it does not perform business actions.

## Completion loop

For a bounded change, use this loop:

1. Inspect the relevant definition, service, and test.
2. Make one small change.
3. Run typecheck and focused tests.
4. Update the documentation and audit trail.
5. Run the full suite and build before packaging.
