import { runDemo } from "../../../../src/domains/wv-land/demo";

export async function POST(): Promise<Response> {
  try {
    return Response.json(await runDemo());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
