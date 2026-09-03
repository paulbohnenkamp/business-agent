import type { TelemetrySink } from "./ports";

export interface RunEvent { name: string; runId: string; domain: string; flow: string; properties?: Readonly<Record<string, string>>; }

export class RunTelemetry {
  constructor(private readonly sink: TelemetrySink) {}
  async record(event: RunEvent): Promise<void> { await this.sink.event(event.name, { runId: event.runId, domain: event.domain, flow: event.flow, ...event.properties }); }
}
