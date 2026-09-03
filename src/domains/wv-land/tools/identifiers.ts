export type IdentifierKind = "api" | "permit";

export interface IdentifierComparison {
  readonly kind: IdentifierKind;
  readonly left: string | undefined;
  readonly right: string | undefined;
  readonly result: "equal" | "different" | "unknown";
  readonly reason?: string;
}

/** Converts a WV API number to its ten-digit canonical representation. */
export function normalizeApiNumber(value: unknown): string {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) throw new Error("API number must be a safe non-negative integer");
  if (typeof value !== "string" && typeof value !== "number") throw new Error("API number must be a string or number");
  const text = String(value).trim();
  if (/^\d{10}$/.test(text)) return text;
  const grouped = /^(\d{2})([- ])(\d{3})\2(\d{5})$/.exec(text);
  if (grouped !== null) return `${grouped[1]}${grouped[3]}${grouped[4]}`;
  throw new Error("API number must be ten digits or use consistent WV group separators");
}

/** Converts supported publisher permit formats to a stable comparison value. */
export function normalizePermitId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Permit ID must be a string or number");
  const text = String(value).trim();
  if (/^\d{3}-\d{5}$/.test(text)) return text;
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 3)}-${text.slice(3)}`;
  if (/^\d{1,5}$/.test(text)) return text;
  throw new Error("Permit ID has an ambiguous or unsupported format");
}

/** Compares identifiers only after applying the same explicit normalization rules. */
export function compareIdentifiers(kind: IdentifierKind, left: unknown, right: unknown): IdentifierComparison {
  const normalize = kind === "api" ? normalizeApiNumber : normalizePermitId;
  const leftValue = left === undefined || left === null || String(left).trim() === "" ? undefined : normalize(left);
  const rightValue = right === undefined || right === null || String(right).trim() === "" ? undefined : normalize(right);
  if (leftValue === undefined || rightValue === undefined) return { kind, left: leftValue, right: rightValue, result: "unknown", reason: "One or both identifiers are absent." };
  return { kind, left: leftValue, right: rightValue, result: leftValue === rightValue ? "equal" : "different" };
}
