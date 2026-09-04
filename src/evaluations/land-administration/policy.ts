export interface LandEvaluationPolicy {
  readonly jurisdictionId: string;
  readonly allowedRoutes: readonly string[];
  readonly sourceIndependence?: (sourceIds: readonly string[]) => boolean;
  readonly isTitleProof: (assertion: string) => boolean;
}

export function evaluateLandPolicy(policy: LandEvaluationPolicy, input: { readonly route?: string; readonly sourceIds?: readonly string[]; readonly assertion?: string }): readonly string[] {
  const failures: string[] = [];
  if (input.route !== undefined && !policy.allowedRoutes.includes(input.route)) failures.push("route-not-allowed");
  if (policy.sourceIndependence !== undefined && !policy.sourceIndependence(input.sourceIds ?? [])) failures.push("source-independence");
  if (input.assertion !== undefined && policy.isTitleProof(input.assertion)) failures.push("public-evidence-is-not-title-proof");
  return failures;
}
