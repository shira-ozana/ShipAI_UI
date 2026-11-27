/** `FeatureItem` from `GET /api/features`. */
export interface FeatureItem {
  feature_id: string
  created_at: string
}

/** Response of `GET /api/features`. Features are oldest first; keep that order in the UI. */
export interface FeaturesList {
  username: string
  repo_url: string
  features: FeatureItem[]
}
