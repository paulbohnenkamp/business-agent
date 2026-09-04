import { decideDemoReview, getDemoReview, getDemoRun } from "../../../../../src/domains/wv-land/demo";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }): Promise<Response> {
  try {
    const { runId } = await context.params;
    return Response.json({ aggregate: await getDemoRun(runId), review: await getDemoReview(runId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 404 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }): Promise<Response> {
  try {
    const { runId } = await context.params;
    const body = await request.json() as { decision?: "approved" | "rejected" | "revision-requested"; reviewerId?: string; reason?: string };
    if (!body.decision || !body.reviewerId || !body.reason) return Response.json({ error: "decision, reviewerId, and reason are required" }, { status: 400 });
    return Response.json(await decideDemoReview(runId, body.decision, body.reviewerId, body.reason));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
