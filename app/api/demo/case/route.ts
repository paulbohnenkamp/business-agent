import { loadDemoCase } from "../../../../src/domains/wv-land/demo";

export async function GET(): Promise<Response> {
  try {
    return Response.json(await loadDemoCase());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
