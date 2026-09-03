export interface NormalizedName {
  readonly original: string;
  readonly normalized: string;
}

/** Normalizes a publisher or submitted name for deterministic comparison. */
export function normalizeName(value: string): NormalizedName {
  if (typeof value !== "string" || value.trim() === "") throw new Error("Name must be a non-empty string");
  const normalized = value.normalize("NFKC").toUpperCase().replaceAll("&", " AND ").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  if (normalized === "") throw new Error("Name has no comparable characters");
  return { original: value, normalized };
}

/** Compares names while retaining both original publisher values. */
export function compareNames(left: string | undefined, right: string | undefined): { readonly left?: NormalizedName; readonly right?: NormalizedName; readonly result: "equal" | "different" | "unknown" } {
  const leftValue = left === undefined || left.trim() === "" ? undefined : normalizeName(left);
  const rightValue = right === undefined || right.trim() === "" ? undefined : normalizeName(right);
  if (leftValue === undefined || rightValue === undefined) return { ...(leftValue === undefined ? {} : { left: leftValue }), ...(rightValue === undefined ? {} : { right: rightValue }), result: "unknown" };
  return { left: leftValue, right: rightValue, result: leftValue.normalized === rightValue.normalized ? "equal" : "different" };
}
