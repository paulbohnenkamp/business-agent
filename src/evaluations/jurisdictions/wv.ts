import { WV_LAND_POLICY, requiresIndependentSourceEvidence } from "../../domains/land-administration/jurisdictions/wv/policy";
import type { LandEvaluationPolicy } from "../land-administration/policy";

export const wvEvaluationPolicy: LandEvaluationPolicy = {
  jurisdictionId: WV_LAND_POLICY.jurisdictionId,
  allowedRoutes: ["continue", "request-records", "human-review"],
  sourceIndependence: requiresIndependentSourceEvidence,
  isTitleProof: (assertion) => /(?:title|ownership).*(?:certif|proved|established)/i.test(assertion),
};
