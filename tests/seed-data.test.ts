import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("fictional land seed records are internally coherent", async () => {
  const lease = JSON.parse(await readFile("examples/land-records/lease-L-2001.json", "utf8")) as { leaseId: string; royaltyRate: number; sourceDocuments: string[] };
  const obligations = JSON.parse(await readFile("examples/land-records/obligations-L-2001.json", "utf8")) as Array<{ leaseId: string }>;
  const divisionOrder = JSON.parse(await readFile("examples/land-records/division-order-DO-77.json", "utf8")) as { netMineralAcres: number; unitAcres: number; royaltyRate: number; proposedDecimal: number };
  assert.equal(lease.leaseId, "L-2001");
  assert.ok(lease.sourceDocuments.length > 0);
  assert.ok(obligations.every((obligation) => obligation.leaseId === lease.leaseId));
  const calculated = (divisionOrder.netMineralAcres / divisionOrder.unitAcres) * divisionOrder.royaltyRate;
  assert.ok(Math.abs(calculated - divisionOrder.proposedDecimal) < 0.00000001);
});
