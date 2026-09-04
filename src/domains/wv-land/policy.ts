/** WV composition policy: publisher independence is a jurisdiction concern. */
export const WV_LAND_POLICY = {
  jurisdictionId: "wv",
  requiredIndependentSources: ["wvdep-oog-rbdms-wells", "wvges-oilgas-wells"] as const,
  publicEvidenceIsNotTitleProof: true,
  humanReviewRequiredBeforeAction: true,
} as const;

export function requiresIndependentSourceEvidence(sourceIds: readonly string[]): boolean {
  return WV_LAND_POLICY.requiredIndependentSources.every((sourceId) => sourceIds.includes(sourceId));
}
