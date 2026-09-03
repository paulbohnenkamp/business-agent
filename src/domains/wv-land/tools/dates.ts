export interface SourceDate {
  readonly original: string;
  readonly year: number;
  readonly month?: number;
  readonly day?: number;
  readonly precision: "year" | "month" | "day";
}

/** Parses a source date without adding precision or inventing an effective date. */
export function parseSourceDate(value: string): SourceDate {
  if (typeof value !== "string") throw new Error("Source date must be a string");
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (match === null) throw new Error("Source date must be YYYY, YYYY-MM, or YYYY-MM-DD");
  const year = Number(match[1]);
  const month = match[2] === undefined ? undefined : Number(match[2]);
  const day = match[3] === undefined ? undefined : Number(match[3]);
  if (month !== undefined && (month < 1 || month > 12)) throw new Error("Source date month is invalid");
  if (day !== undefined && (month === undefined || day < 1 || day > daysInMonth(year, month))) throw new Error("Source date day is invalid");
  return { original: value, year, ...(month === undefined ? {} : { month }), ...(day === undefined ? {} : { day }), precision: day === undefined ? (month === undefined ? "year" : "month") : "day" };
}

function daysInMonth(year: number, month: number): number { if (month === 2) return isLeapYear(year) ? 29 : 28; return [4, 6, 9, 11].includes(month) ? 30 : 31; }
function isLeapYear(year: number): boolean { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }

/** Compares dates without treating a less precise date as an exact match. */
export function compareSourceDates(left: string | SourceDate | undefined, right: string | SourceDate | undefined): { readonly result: "equal" | "different" | "overlapping" | "unknown"; readonly left?: SourceDate; readonly right?: SourceDate } {
  const leftValue = left === undefined ? undefined : typeof left === "string" ? parseSourceDate(left) : left;
  const rightValue = right === undefined ? undefined : typeof right === "string" ? parseSourceDate(right) : right;
  if (leftValue === undefined || rightValue === undefined) return { ...(leftValue === undefined ? {} : { left: leftValue }), ...(rightValue === undefined ? {} : { right: rightValue }), result: "unknown" };
  const same = leftValue.year === rightValue.year && leftValue.month === rightValue.month && leftValue.day === rightValue.day;
  if (same && leftValue.precision === rightValue.precision) return { left: leftValue, right: rightValue, result: "equal" };
  const prefix = (a: SourceDate, b: SourceDate) => a.year === b.year && (a.month === undefined || a.month === b.month) && (a.day === undefined || a.day === b.day);
  return { left: leftValue, right: rightValue, result: prefix(leftValue, rightValue) || prefix(rightValue, leftValue) ? "overlapping" : "different" };
}
