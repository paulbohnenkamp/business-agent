type RecordObject = Record<string, unknown>;

function isRecord(value: unknown): value is RecordObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Shared JSON boundary mechanics used by the focused WV land codecs. */
export class JsonBoundary {
  encode<T>(value: unknown, label: string, reader: (value: unknown) => T): string {
    const validated = reader(value);
    let serialized: string | undefined;
    try {
      // Optional fields may be represented as undefined by typed callers; JSON
      // canonicalization stores those as absent, while reader-level validation
      // rejects undefined where it would be a meaningful value.
      serialized = JSON.stringify(validated);
    } catch (error) {
      throw new Error(`${label} contains a non-JSON value: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (serialized === undefined) throw new Error(`${label} cannot be serialized`);
    this.assertJsonSafe(JSON.parse(serialized));
    return serialized;
  }

  decode<T>(serialized: string, label: string, reader: (value: unknown) => T): T {
    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch (error) {
      throw new Error(`Invalid ${label} JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      return JSON.parse(JSON.stringify(reader(value)));
    } catch (error) {
      throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Freezes a decoded JSON tree so shared evidence cannot be mutated in memory. */
  deepFreeze<T extends object>(value: T): Readonly<T> {
    for (const key of Object.getOwnPropertyNames(value)) {
      const nested = Reflect.get(value, key);
      if (typeof nested === "object" && nested !== null && !Object.isFrozen(nested)) this.deepFreeze(nested);
    }
    return Object.freeze(value);
  }

  object(value: unknown): RecordObject {
    if (!isRecord(value)) throw new Error("record must be an object");
    return value;
  }

  string(object: RecordObject, key: string): string {
    const value = object[key];
    if (typeof value !== "string" || value.trim() === "") throw new Error(`${key} must be a non-empty string`);
    return value;
  }

  optionalString(object: RecordObject, key: string): string | undefined {
    const value = object[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error(`${key} must be a string when present`);
    return value;
  }

  number(object: RecordObject, key: string): number {
    const value = object[key];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${key} must be a finite number`);
    return value;
  }

  optionalNumber(object: RecordObject, key: string): number | undefined {
    return object[key] === undefined ? undefined : this.number(object, key);
  }

  stringArray(object: RecordObject, key: string): string[] {
    const value = object[key];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) throw new Error(`${key} must be an array of non-empty strings`);
    return [...value];
  }

  enumValue<T extends string>(object: RecordObject, key: string, values: readonly T[]): T {
    const value = object[key];
    if (typeof value !== "string") throw new Error(`${key} has an unsupported value`);
    const match = values.find((candidate) => candidate === value);
    if (match === undefined) throw new Error(`${key} has an unsupported value`);
    return match;
  }

  timestamp(object: RecordObject, key: string): string {
    const value = this.string(object, key);
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (match === null || !this.isCalendarDate(match[1], match[2], match[3]) || Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59 || (match[7] !== "Z" && (Number(match[7].slice(1, 3)) > 23 || Number(match[7].slice(4, 6)) > 59))) throw new Error(`${key} must be an RFC 3339 timestamp with an explicit timezone`);
    return value;
  }

  optionalDate(object: RecordObject, key: string): string | undefined {
    const value = object[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error(`${key} must be a valid date when present`);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match === null) throw new Error(`${key} must be a valid date when present`);
    if (!this.isCalendarDate(match[1], match[2], match[3])) throw new Error(`${key} must be a valid date when present`);
    return value;
  }

  url(object: RecordObject, key: string): string {
    const value = this.string(object, key);
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported protocol");
    } catch (error) {
      throw new Error(`${key} must be an absolute HTTP(S) URL: ${error instanceof Error ? error.message : String(error)}`);
    }
    return value;
  }

  jsonValue(value: unknown, label: string): unknown {
    this.assertJsonSafe(value, label);
    return value;
  }

  private assertJsonSafe(value: unknown, label = "record", seen = new Set<object>()): void {
    if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw new Error(`${label} contains a non-JSON value`);
    if (typeof value !== "object" || value === null) {
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`);
      return;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) throw new Error(`${label} contains a non-JSON object`);
    if (seen.has(value)) throw new Error(`${label} contains a circular reference`);
    seen.add(value);
    if (Array.isArray(value)) value.forEach((item, index) => this.assertJsonSafe(item, `${label}[${index}]`, seen));
    else Object.entries(value).forEach(([key, item]) => this.assertJsonSafe(item, `${label}.${key}`, seen));
    seen.delete(value);
  }

  private isCalendarDate(yearText: string, monthText: string, dayText: string): boolean {
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (month < 1 || month > 12 || day < 1) return false;
    return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
  }
}
