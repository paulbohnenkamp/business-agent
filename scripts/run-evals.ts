import { loadAgents } from "../src/core/agents";
import { MockExecutor } from "../src/core/orchestrator";
import { evaluateExecutor, loadEvaluationCases, summarizeEvaluations, writeEvaluationSummary } from "../src/evaluations/local";

const root = "domains/land-administration";
const agentId = process.argv[2] ?? "case-synthesizer";
const outputPath = process.argv[3];
const agents = await loadAgents(root);
const agent = agents.get(agentId);
if (!agent) throw new Error(`Unknown evaluation agent: ${agentId}`);
const cases = [
  ...(await loadEvaluationCases("evaluations/land-admin-cases.jsonl")),
  ...(await loadEvaluationCases("evaluations/adversarial-land-admin.jsonl")),
];
const summary = summarizeEvaluations(await evaluateExecutor(new MockExecutor(), agent, cases));
console.log(JSON.stringify(summary, null, 2));
if (outputPath) await writeEvaluationSummary(outputPath, summary);
if (summary.failed > 0) process.exitCode = 1;
