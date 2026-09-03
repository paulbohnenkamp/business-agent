import type { Conflict, Finding, ProductionRecord, SourceIdentity, SourceSnapshot, Unknown, WvProductionEvidence, WvWellEvidence, Well } from "./contracts";
import { WvFactCodec } from "./fact-codec";
import { WvJudgmentCodec } from "./judgment-codec";
import { JsonBoundary } from "./json-boundary";
import { WvSourceCodec } from "./source-codec";

/**
 * Typed JSON persistence boundary for Phase 1 WV land records.
 *
 * Every encode method validates the runtime value before persistence; every
 * decode method validates untrusted JSON before returning a domain record.
 * This façade composes focused codecs so source metadata, judgments, and
 * normalized facts can evolve independently as later persistence adapters are
 * introduced.
 */
export class WvLandJsonCodec {
  constructor(
    json: JsonBoundary = new JsonBoundary(),
    private readonly facts: WvFactCodec = new WvFactCodec(json),
    private readonly sources: WvSourceCodec = new WvSourceCodec(json, facts),
    private readonly judgments: WvJudgmentCodec = new WvJudgmentCodec(json),
  ) {}

  /** Encodes and validates a dataset identity. */
  encodeSourceIdentity(value: SourceIdentity): string { return this.sources.encodeIdentity(value); }
  /** Decodes and validates untrusted source identity JSON. */
  decodeSourceIdentity(serialized: string): SourceIdentity { return this.sources.decodeIdentity(serialized); }
  /** Encodes snapshot metadata after validating its immutable marker and hash. */
  encodeSourceSnapshot(value: SourceSnapshot): string { return this.sources.encodeSnapshot(value); }
  /** Decodes a snapshot and freezes its runtime metadata and nested source identity. */
  decodeSourceSnapshot(serialized: string): SourceSnapshot { return this.sources.decodeSnapshot(serialized); }
  /** Encodes normalized well evidence with its source and snapshot links. */
  encodeWellEvidence(value: WvWellEvidence): string { return this.sources.encodeWellEvidence(value); }
  /** Decodes normalized well evidence and validates its well facts. */
  decodeWellEvidence(serialized: string): WvWellEvidence { return this.sources.decodeWellEvidence(serialized); }
  /** Encodes normalized production evidence with its source and snapshot links. */
  encodeProductionEvidence(value: WvProductionEvidence): string { return this.sources.encodeProductionEvidence(value); }
  /** Decodes normalized production evidence and validates its production facts. */
  decodeProductionEvidence(serialized: string): WvProductionEvidence { return this.sources.decodeProductionEvidence(serialized); }
  /** Encodes normalized well facts. */
  encodeWell(value: Well): string { return this.facts.encodeWell(value); }
  /** Decodes normalized well facts. */
  decodeWell(serialized: string): Well { return this.facts.decodeWell(serialized); }
  /** Encodes one production reporting record. */
  encodeProductionRecord(value: ProductionRecord): string { return this.facts.encodeProductionRecord(value); }
  /** Decodes one production reporting record. */
  decodeProductionRecord(serialized: string): ProductionRecord { return this.facts.decodeProductionRecord(serialized); }
  /** Encodes a durable evidence-linked finding. */
  encodeFinding(value: Finding): string { return this.judgments.encodeFinding(value); }
  /** Decodes a durable finding and enforces its outcome evidence invariant. */
  decodeFinding(serialized: string): Finding { return this.judgments.decodeFinding(serialized); }
  /** Encodes a conflict without collapsing competing claims. */
  encodeConflict(value: Conflict): string { return this.judgments.encodeConflict(value); }
  /** Decodes a conflict and validates every claim's evidence references. */
  decodeConflict(serialized: string): Conflict { return this.judgments.decodeConflict(serialized); }
  /** Encodes an explicit evidence gap. */
  encodeUnknown(value: Unknown): string { return this.judgments.encodeUnknown(value); }
  /** Decodes an explicit evidence gap. */
  decodeUnknown(serialized: string): Unknown { return this.judgments.decodeUnknown(serialized); }
}
