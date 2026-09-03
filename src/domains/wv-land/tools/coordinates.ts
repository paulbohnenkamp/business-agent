export interface Coordinate { readonly latitude: number; readonly longitude: number; readonly datum?: string; }
export type DistanceUnit = "meters" | "kilometers" | "miles";
export interface CoordinateComparison { readonly result: "within-tolerance" | "outside-tolerance" | "unknown"; readonly distance?: number; readonly unit: DistanceUnit; readonly tolerance: number; readonly datumAssumption: string; readonly reason?: string; }

/** Compares approximate proximity using spherical haversine distance, not cadastral or survey measurement. */
export function compareCoordinates(left: Coordinate | undefined, right: Coordinate | undefined, options: { readonly unit?: DistanceUnit; readonly tolerance: number } ): CoordinateComparison {
  const unit = options.unit ?? "meters";
  if (!isDistanceUnit(unit)) throw new Error("Coordinate distance unit must be meters, kilometers, or miles");
  if (!Number.isFinite(options.tolerance) || options.tolerance < 0) throw new Error("Coordinate tolerance must be a finite non-negative number");
  if (left === undefined || right === undefined) return { result: "unknown", unit, tolerance: options.tolerance, datumAssumption: "No coordinate was supplied." };
  validate(left); validate(right);
  const leftDatum = left.datum?.toUpperCase() ?? "WGS84";
  const rightDatum = right.datum?.toUpperCase() ?? "WGS84";
  if (leftDatum !== rightDatum || !["WGS84", "EPSG:4326"].includes(leftDatum)) return { result: "unknown", unit, tolerance: options.tolerance, datumAssumption: `Comparison requires matching WGS84-compatible datums; received ${leftDatum} and ${rightDatum}.` };
  const radius = unit === "miles" ? 3958.7613 : unit === "kilometers" ? 6371.0088 : 6371008.8;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(right.latitude - left.latitude) / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(radians(right.longitude - left.longitude) / 2) ** 2;
  const distance = 2 * radius * Math.asin(Math.sqrt(Math.min(1, a)));
  return { result: distance <= options.tolerance ? "within-tolerance" : "outside-tolerance", distance, unit, tolerance: options.tolerance, datumAssumption: "Spherical haversine approximation using mean-earth-radius WGS84 coordinates; suitable for deterministic proximity comparison, not survey measurement." };
}

function isDistanceUnit(value: unknown): value is DistanceUnit { return value === "meters" || value === "kilometers" || value === "miles"; }
function validate(value: Coordinate): void { if (!Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90) throw new Error("Latitude must be finite and between -90 and 90"); if (!Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) throw new Error("Longitude must be finite and between -180 and 180"); }
