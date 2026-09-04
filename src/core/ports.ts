export interface RetrievedDocument {
  id: string;
  text: string;
  score: number;
  provenance: { source: string; locator: string }[];
}

export interface RetrievalProvider {
  search(query: string, limit?: number): Promise<RetrievedDocument[]>;
}

export interface TelemetrySink {
  event(name: string, properties?: Readonly<Record<string, string>>): Promise<void>;
}

export interface ConsequentialActionGateway {
  execute(action: string, input: Readonly<Record<string, unknown>>): Promise<{ status: "blocked" | "executed"; reason?: string }>;
}

/** Safe defaults for local development; these deliberately have no external side effects. */
export class NoopTelemetry implements TelemetrySink {
  async event(_name: string, _properties?: Readonly<Record<string, string>>): Promise<void> {}
}

export class BlockedActionGateway implements ConsequentialActionGateway {
  async execute(_action: string, _input: Readonly<Record<string, unknown>>): Promise<{ status: "blocked"; reason: string }> {
    return { status: "blocked", reason: "Consequential actions require an approved gateway." };
  }
}
