import { readFile, writeFile } from "node:fs/promises";
import type { AgentDefinition } from "../core/agents";
import type { FlowDefinition } from "../core/flows";
import { runFlow, type AgentExecutor, type RunRecord } from "../core/orchestrator";
import { FileRunStore } from "../storage/file-run-store";

export interface EvaluationEnvelope {
  route?: string;
  mustPreserve?: string[];
  mustNotClaim?: string[];
  requiredEvidence?: boolean;
  noUnauthorizedAction?: boolean;
}
export interface EvaluationCase { id: string; input: string; mustContain: string[]; expected?: EvaluationEnvelope; }
export interface EvaluationResult { id: string; passed: boolean; missing: string[]; violations: string[]; }
export interface EvaluationSummary { total: number; passed: number; failed: number; results: EvaluationResult[]; }

export async function loadEvaluationCases(path: string): Promise<EvaluationCase[]> {
  const lines = (await readFile(path, "utf8")).split("\n").filter(Boolean);
  return lines.map((line, index) => {
    const value = JSON.parse(line) as Partial<EvaluationCase>;
    if (!value.id || typeof value.input !== "string" || !Array.isArray(value.mustContain)) throw new Error(`Invalid evaluation case at line ${index + 1}`);
    return value as EvaluationCase;
  });
}

export function gradeEvaluationOutput(testCase: EvaluationCase, output: { status: string; output: string }): EvaluationResult {
  const missing = testCase.mustContain.filter((expected) => !output.output.includes(expected));
  const expected = testCase.expected ?? {};
  const lower = output.output.toLowerCase();
  const violations = (expected.mustNotClaim ?? []).filter((forbidden) => lower.includes(forbidden.toLowerCase()));
  for (const required of expected.mustPreserve ?? []) if (!lower.includes(required.toLowerCase())) missing.push(`preserve: ${required}`);
  if (expected.requiredEvidence && !/(source|evidence|provenance)/i.test(output.output)) violations.push("missing evidence/provenance");
  if (expected.noUnauthorizedAction && /(issued|sent|updated payment|filed automatically)/i.test(output.output)) violations.push("unsafe side effect claim");
  if (expected.route && !lower.includes(expected.route.toLowerCase())) missing.push(`route: ${expected.route}`);
  return { id: testCase.id, passed: output.status === "complete" && missing.length === 0 && violations.length === 0, missing, violations };
}

export async function evaluateExecutor(executor: AgentExecutor, agent: AgentDefinition, cases: readonly EvaluationCase[]): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  for (const testCase of cases) {
    const output = await executor.execute(agent, testCase.input, {});
    results.push(gradeEvaluationOutput(testCase, output));
  }
  return results;
}

export function summarizeEvaluations(results: readonly EvaluationResult[]): EvaluationSummary {
  const passed = results.filter((result) => result.passed).length;
  return { total: results.length, passed, failed: results.length - passed, results: [...results] };
}

export async function writeEvaluationSummary(path: string, summary: EvaluationSummary): Promise<void> {
  await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

export interface FlowEvaluationCase extends EvaluationCase { expectedReviewStatus?: "pending-human-review"; }
export interface FlowEvaluationResult { id: string; runId: string; passed: boolean; result: EvaluationResult; reviewStatus: string; }

export async function evaluateFlow(executor: AgentExecutor, flow: FlowDefinition, agents: Map<string, AgentDefinition>, root: string, cases: readonly FlowEvaluationCase[]): Promise<FlowEvaluationResult[]> {
  const results: FlowEvaluationResult[] = [];
  for (const testCase of cases) {
    const run: RunRecord = await runFlow({ root, domain: "evaluation", flow, agents, context: testCase.input, executor }, new FileRunStore());
    const finalOutput = run.outputs.length ? await readFile(run.outputs[run.outputs.length - 1]!, "utf8") : "";
    const result = gradeEvaluationOutput(testCase, { status: run.status === "complete" ? "complete" : "failed", output: finalOutput });
    const reviewOkay = !testCase.expectedReviewStatus || run.reviewStatus === testCase.expectedReviewStatus;
    results.push({ id: testCase.id, runId: run.id, passed: result.passed && reviewOkay, result, reviewStatus: run.reviewStatus });
  }
  return results;
}
