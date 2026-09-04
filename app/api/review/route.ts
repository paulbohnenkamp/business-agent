import { loadConfig } from "../../../src/core/config";
import { updateReviewStatus } from "../../../src/core/orchestrator";
import { FileRunStore } from "../../../src/storage/file-run-store";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { runId?: string; status?: "approved" | "rejected" };
    if (!body.runId || !body.status) return Response.json({ error: "runId and status are required" }, { status: 400 });
    const record = await updateReviewStatus(loadConfig().workspacePath, body.runId, body.status, new FileRunStore());
    return Response.json(record);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
