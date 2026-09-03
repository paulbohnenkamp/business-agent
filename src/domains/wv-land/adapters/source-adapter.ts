import type { SourceEvidence } from "../contracts";

export interface SourceAdapterQuery {
  readonly apiNumber?: string;
  readonly permitId?: string;
  readonly resultOffset?: number;
  readonly resultRecordCount?: number;
}

export interface SourceAdapter<TFacts> {
  query(query: SourceAdapterQuery): Promise<readonly SourceEvidence<TFacts>[]>;
}

export class SourceAdapterError extends Error {
  constructor(
    readonly kind: "request" | "parse" | "schema" | "pagination",
    message: string,
    readonly sourceId: string,
  ) {
    super(message);
    this.name = "SourceAdapterError";
  }
}
