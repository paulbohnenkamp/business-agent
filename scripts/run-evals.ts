import { writeFile } from "node:fs/promises";
import { loadAgents } from "../src/core/agents";
import { MockExecutor } from "../src/core/orchestrator";
import { evaluateExecutor, loadEvaluationCases, summarizeEvaluations, writeEvaluationSummary } from "../src/evaluations/local";
import { loadWvEvaluationCases, evaluateWvSuite, summarizeWvEvaluations } from "../src/evaluations/wv-land";

const root = "domains/land-administration";
const agentId = process.argv[2] ?? "case-synthesizer";
const outputPath = process.argv[3];

if (agentId === "wv-land-well-reconciliation") {
  const cases = await loadWvEvaluationCases("evaluations/wv-land.jsonl");
  if (outputPath === "list" || outputPath === "--list") {
    for (const testCase of cases) console.log(`${testCase.id}\t${testCase.executionKind}`);
    process.exit(0);
  }
  const agents = await loadAgents(root);
  const executorModule = process.env.WV_EVAL_EXECUTOR_MODULE;
  const behavioralExecutor = executorModule === undefined ? undefined : (await import(executorModule)).default;
  const summary = summarizeWvEvaluations(await evaluateWvSuite(cases, { agents, behavioralExecutor }));
  console.log(JSON.stringify(summary, null, 2));
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  if (summary.deterministicFailed > 0 || summary.behavioralFailed > 0 || summary.behavioralExecutionFailed > 0) process.exitCode = 1;
  process.exit(0);
}

if (agentId === "list" && (process.argv[3] === "wv-land-well-reconciliation" || process.argv[3] === "--wv-land-well-reconciliation")) {
  for (const testCase of await loadWvEvaluationCases("evaluations/wv-land.jsonl")) console.log(`${testCase.id}\t${testCase.executionKind}`);
  process.exit(0);
}

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
