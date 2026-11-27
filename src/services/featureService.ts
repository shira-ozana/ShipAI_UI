import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, getJson, unexpectedStatus } from '@/lib/http'
import type { FeatureItem, FeaturesList } from '@/types/feature'

const FEATURES_URL = `${PLATFORM_API_URL}/api/features`

function isFeatureItem(value: unknown): value is FeatureItem {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return typeof body.feature_id === 'string' && typeof body.created_at === 'string'
}

function isFeaturesList(value: unknown): value is FeaturesList {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.username === 'string' &&
    typeof body.repo_url === 'string' &&
    Array.isArray(body.features) &&
    body.features.every(isFeatureItem)
  )
}

/**
 * `GET /api/features?username=&repo_url=`. Resolves with the features for that user and repo
 * (oldest first) on `200`.
 */
export async function listFeatures(
  username: string,
  repoUrl: string,
  signal?: AbortSignal,
): Promise<FeaturesList> {
  const url = `${FEATURES_URL}?${new URLSearchParams({
    username,
    repo_url: repoUrl,
  })}`
  const response = await getJson(url, signal)

  if (response.status === 200) {
    if (!isFeaturesList(response.body)) {
      throw new ApiError('The backend sent a response the app could not understand.', 200)
    }
    return response.body
  }
  if (response.status === 401) {
    throw unexpectedStatus(response, 'Your session has expired. Sign in again.')
  }
  throw unexpectedStatus(
    response,
    `Couldn't load features (HTTP ${response.status}). Please try again.`,
  )
}
