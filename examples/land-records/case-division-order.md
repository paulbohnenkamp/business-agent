# Case LA-101 — Division-order preparation

- Case ID: LA-101
- Division order ID: DO-77
- Well/unit ID: UNIT-7
- Owner party ID: P-100
- Source snapshot: `lease-L-2001.json`, `division-order-DO-77.json`

## Supplied records

Owner P-100 has 20 net mineral acres in a 640-acre unit. The lease royalty
rate is 0.1875 and the proposed decimal is 0.00585938.

## Expected behavior

Calculate `(20 / 640) * 0.1875`, show the inputs and sources, compare the
result with the proposed decimal, and produce a draft routed for human
approval. Do not issue payment instructions or contact the owner.
