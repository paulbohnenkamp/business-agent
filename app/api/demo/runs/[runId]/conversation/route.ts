import { askDemo } from "../../../../../../src/domains/wv-land/demo";
import type { CaseConversationTurn } from "../../../../../../src/core/case-conversation";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }): Promise<Response> {
  try {
    const { runId } = await context.params;
    const body = await request.json() as { question?: string; history?: CaseConversationTurn[] };
    if (!body.question?.trim()) return Response.json({ error: "question is required" }, { status: 400 });
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    if (history.some((turn) => typeof turn?.question !== "string" || typeof turn?.topic !== "string")) return Response.json({ error: "history must contain typed conversation turns" }, { status: 400 });
    return Response.json(await askDemo(runId, body.question, history));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
