import { createHash } from "node:crypto";

export interface RetrievalSource { readonly id: string; }
export interface RetrievalSnapshot {
  readonly snapshotId: string;
  readonly sourceId: string;
  readonly requestUrl: string;
  readonly retrievedAt: string;
  readonly effectiveDate?: string;
  readonly publicationDate?: string;
  readonly contentType: string;
  readonly contentHash: string;
  readonly rawSnapshotRef: string;
  readonly byteLength: number;
  readonly parserVersion?: string;
  readonly immutable: true;
}

export interface RetrievedSource {
  readonly snapshot: RetrievalSnapshot;
  readonly bytes: Uint8Array;
}

export interface SourceRetrievalProvider {
  retrieve(requestUrl: string, source: RetrievalSource, options?: Readonly<{
    effectiveDate?: string;
    publicationDate?: string;
    parserVersion?: string;
  }>): Promise<RetrievedSource>;
}

export class SourceRetrievalError extends Error {
  constructor(
    readonly kind: "transport" | "status" | "snapshot" | "size" | "timeout",
    message: string,
    readonly requestUrl: string,
  ) {
    super(message);
    this.name = "SourceRetrievalError";
  }
}

export class HttpSourceRetrievalProvider implements SourceRetrievalProvider {
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly options: Readonly<{ timeoutMs?: number; maxBytes?: number }> = {}) {}

  async retrieve(requestUrl: string, source: RetrievalSource, options: Readonly<{
    effectiveDate?: string;
    publicationDate?: string;
    parserVersion?: string;
  }> = {}): Promise<RetrievedSource> {
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const maxBytes = this.options.maxBytes ?? 50_000_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(requestUrl, { signal: controller.signal });
    } catch (error) {
      clearTimeout(timer);
      throw new SourceRetrievalError(controller.signal.aborted ? "timeout" : "transport", error instanceof Error ? error.message : String(error), requestUrl);
    }
    if (!response.ok) { clearTimeout(timer); throw new SourceRetrievalError("status", `Source returned HTTP ${response.status}`, requestUrl); }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) { clearTimeout(timer); throw new SourceRetrievalError("size", `Source exceeds ${maxBytes} byte limit`, requestUrl); }
    let bytes: Uint8Array;
    try {
      if (response.body === null) bytes = new Uint8Array(await response.arrayBuffer());
      else {
        const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
        for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > maxBytes) { await reader.cancel(); throw new SourceRetrievalError("size", `Source exceeds ${maxBytes} byte limit`, requestUrl); } chunks.push(part.value); }
        bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      }
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof SourceRetrievalError) throw error;
      throw new SourceRetrievalError(controller.signal.aborted ? "timeout" : "transport", error instanceof Error ? error.message : String(error), requestUrl);
    }
    clearTimeout(timer);
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const retrievedAt = new Date().toISOString();
    return {
      bytes,
      snapshot: {
        snapshotId: `snapshot-${contentHash}`,
        sourceId: source.id,
        requestUrl,
        retrievedAt,
        ...(options.effectiveDate === undefined ? {} : { effectiveDate: options.effectiveDate }),
        ...(options.publicationDate === undefined ? {} : { publicationDate: options.publicationDate }),
        contentType: response.headers.get("content-type")?.split(";", 1)[0] ?? "application/octet-stream",
        contentHash,
        rawSnapshotRef: `sha256:${contentHash}`,
        byteLength: bytes.byteLength,
        ...(options.parserVersion === undefined ? {} : { parserVersion: options.parserVersion }),
        immutable: true,
      },
    };
  }
}

export class StaticSourceRetrievalProvider implements SourceRetrievalProvider {
  private readonly entries: ReadonlyMap<string, RetrievedSource>;

  constructor(entries: ReadonlyMap<string, RetrievedSource> | Readonly<Record<string, RetrievedSource>>) {
    this.entries = entries instanceof Map ? entries : new Map(Object.entries(entries));
  }

  async retrieve(requestUrl: string, source: RetrievalSource): Promise<RetrievedSource> {
    const entry = this.entries.get(requestUrl) ?? [...this.entries.entries()].find(([candidate]) => equivalentUrls(candidate, requestUrl))?.[1];
    if (entry === undefined) throw new SourceRetrievalError("transport", "No static source fixture for URL", requestUrl);
    if (entry.snapshot.sourceId !== source.id) throw new SourceRetrievalError("snapshot", "Static snapshot source does not match request source", requestUrl);
    const actualHash = createHash("sha256").update(entry.bytes).digest("hex");
    if (actualHash !== entry.snapshot.contentHash || entry.bytes.byteLength !== entry.snapshot.byteLength) throw new SourceRetrievalError("snapshot", "Static snapshot metadata does not match bytes", requestUrl);
    if (entry.snapshot.requestUrl !== requestUrl && !equivalentUrls(entry.snapshot.requestUrl, requestUrl)) throw new SourceRetrievalError("snapshot", "Static snapshot URL does not match request URL", requestUrl);
    return entry;
  }
}

function equivalentUrls(left: string, right: string): boolean {
  try {
    const a = new URL(left); const b = new URL(right);
    if (a.origin + a.pathname !== b.origin + b.pathname) return false;
    const params = (url: URL) => [...url.searchParams.entries()].sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
    return JSON.stringify(params(a)) === JSON.stringify(params(b));
  } catch { return false; }
}
