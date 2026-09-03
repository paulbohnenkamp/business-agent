import { createHash } from "node:crypto";

/** Computes the lowercase SHA-256 digest of exact bytes or UTF-8 text. */
export function sha256(value: Uint8Array | string): string { return createHash("sha256").update(value).digest("hex"); }
