import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { POST as conversationPost } from "../app/api/demo/runs/[runId]/conversation/route";
import { runDemo } from "../src/domains/wv-land/demo";
import { WvLocalConversation } from "../src/domains/wv-land/conversation";

describe("case-scoped Ask Business Agent conversation", () => {
  it("answers the seven-question acceptance scenario from the structured run", async () => {
    const root = await mkdtemp(join(tmpdir(), "business-agent-conversation-"));
    const previous = process.env.BUSINESS_AGENT_WORKSPACE;
    process.env.BUSINESS_AGENT_WORKSPACE = root;
    try {
      const aggregate = await runDemo();
      const service = new WvLocalConversation();
      const state = { aggregate, production: { status: "no-match" as const, explanation: "frozen no-match" } };
      const ask = async (question: string, history: { question: string; topic: string }[] = []) => service.respond({ caseId: aggregate.caseId, runId: aggregate.runId, state, question, history });
      const found = await ask("What did you find?");
      assert.equal(found.grounding, "grounded");
      assert.match(found.answer, /submitted API/);
      assert.deepEqual(found.findingRefs, aggregate.result.findings.map((item) => item.findingId));
      assert.equal(found.answer.includes("fabricated"), false);

      const operator = await ask("Do WVDEP and WVGES agree on the operator?");
      assert.match(operator.answer, /do not report the same operator/);
      assert.match(operator.answer, /ROSS AND WHARTON GAS COMPANY, INC\./);
      assert.match(operator.answer, /Ross & Wharton Gas Co\., Inc\./);
      assert.equal(operator.conflictRefs.length, 1);
      assert.deepEqual(new Set(operator.evidenceRefs.map((id) => aggregate.sourceEvidence.find((item) => item.evidenceId === id)?.source.publisher)), new Set(["WVDEP", "WVGES"]));

      const support = await ask("What evidence supports that?", [{ question: "Do WVDEP and WVGES agree on the operator?", topic: operator.topic }]);
      assert.equal(support.topic, "operator-conflict");
      assert.equal(support.evidenceRefs.length, 2);
      assert.match(support.answer, /exact records behind it/);

      const noMatch = await ask("Does this mean the well had zero production?");
      assert.match(noMatch.answer, /not the same as reported zero/);
      const zero = await service.respond({ caseId: aggregate.caseId, runId: aggregate.runId, state: { aggregate, production: { status: "reported-zero", explanation: "reported zero control" } }, question: "Does this mean the well had zero production?", history: [] });
      assert.match(zero.answer, /reported zero production/);
      assert.notEqual(noMatch.answer, zero.answer);

      const unknowns = await ask("What is still unknown?");
      assert.match(unknowns.answer, /remains unknown/);
      assert.equal(unknowns.unknownRefs.length, 2);
      const next = await ask("What should I review next?");
      assert.equal(next.topic, "review-next");
      assert.match(next.answer, /Human review/);
      const title = await ask("Do we know who owns the mineral rights?");
      assert.match(title.answer, /do not know who owns/);
      assert.match(title.answer, /not proof of mineral title/);
      assert.match(title.answer, /human review/);
      assert.equal(title.safety, "bounded");
      assert.equal(/(file|paid|emailed|registry updated|determined title)/i.test(`${found.answer} ${operator.answer} ${support.answer} ${noMatch.answer} ${unknowns.answer} ${next.answer} ${title.answer}`), false);
      for (const response of [found, operator, support, noMatch, unknowns, next, title]) for (const id of response.evidenceRefs) assert.equal(aggregate.evidenceIds.includes(id), true);
    } finally {
      if (previous === undefined) delete process.env.BUSINESS_AGENT_WORKSPACE;
      else process.env.BUSINESS_AGENT_WORKSPACE = previous;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("resolves follow-ups only inside the current case and API boundary", async () => {
    const root = await mkdtemp(join(tmpdir(), "business-agent-conversation-api-"));
    const previous = process.env.BUSINESS_AGENT_WORKSPACE;
    process.env.BUSINESS_AGENT_WORKSPACE = root;
    try {
      const aggregate = await runDemo();
      const response = await conversationPost(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ question: "Do WVDEP and WVGES agree on the operator?" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ runId: aggregate.runId }) });
      assert.equal(response.status, 200);
      const body = await response.json() as { topic: string; conflictRefs: string[] };
      assert.equal(body.topic, "operator-conflict");
      assert.equal(body.conflictRefs.length, 1);
      const foreign = await conversationPost(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ question: "What did you find?" }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ runId: "demo-foreign-run" }) });
      assert.equal(foreign.status, 400);
    } finally {
      if (previous === undefined) delete process.env.BUSINESS_AGENT_WORKSPACE;
      else process.env.BUSINESS_AGENT_WORKSPACE = previous;
      await rm(root, { recursive: true, force: true });
    }
  });
});
