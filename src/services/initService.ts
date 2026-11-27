import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, postJson, unexpectedStatus } from '@/lib/http'

/**
 * Initialization goes through the Platform Backend, on the same base URL (or Vite proxy) as
 * `/api/repositories`:
 *
 *   POST /api/features           body `{ username, repo_url }`
 *                                -> 201 `{ feature_id, username, repo_url, created_at }`
 *                                (verified against `backend/app/routers/features.py`)
 *   POST /api/agents/init/run    body `{ feature_id, project: { repo_url }, dry_run: true }`
 *                                -> 202 `{ runId, status: "running" }`
 *
 * The `/api/agents/init/run` route is NOT in the local backend's OpenAPI document yet
 * (it answers 404), so its contract is taken from the task description, not verified live.
 * There is also no verified status endpoint for these runs. The previous integration's
 * `GET /api/init/{runId}` belongs to the Generic Agent API (a different server and a
 * different run registry), so it is not reused: a 202 only means the run was started, and
 * this module never reports completion.
 */
const FEATURES_URL = `${PLATFORM_API_URL}/api/features`
const INIT_RUN_URL = `${PLATFORM_API_URL}/api/agents/init/run`

const UNREADABLE = 'The backend sent a response the app could not understand.'

function stringField(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null) return null
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/**
 * `POST /api/features` for one repository. Resolves with the new `feature_id` on `201`.
 * Calling it again creates another feature, so callers must keep the returned ID.
 */
export async function createFeature(
  username: string,
  repoUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await postJson(FEATURES_URL, { username, repo_url: repoUrl }, signal)

  if (response.status === 201) {
    const featureId = stringField(response.body, 'feature_id')
    if (!featureId) throw new ApiError(UNREADABLE, 201)
    return featureId
  }
  if (response.status === 404) {
    throw unexpectedStatus(
      response,
      'Could not create a feature: the backend does not know this repository for your user. ' +
        'Add the repository again, then retry.',
    )
  }
  if (response.status === 422) {
    throw unexpectedStatus(
      response,
      'Could not create a feature: the backend rejected the repository URL or username.',
    )
  }
  throw unexpectedStatus(
    response,
    `The feature could not be created (HTTP ${response.status}). Please try again.`,
  )
}

/** `POST /api/agents/init/run`. Resolves with the run id on `202`. */
export async function startInit(
  featureId: string,
  repoUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await postJson(
    INIT_RUN_URL,
    { feature_id: featureId, project: { repo_url: repoUrl }, dry_run: true },
    signal,
  )

  if (response.status === 202) {
    const runId = stringField(response.body, 'runId')
    if (!runId) throw new ApiError(UNREADABLE, 202)
    return runId
  }
  if (response.status === 404) {
    throw unexpectedStatus(
      response,
      'Initialization could not start: the backend does not provide this endpoint ' +
        '(POST /api/agents/init/run). Update or restart the backend, then try again.',
    )
  }
  if (response.status === 422) {
    throw unexpectedStatus(
      response,
      'Initialization could not start: the backend rejected the request.',
    )
  }
  throw unexpectedStatus(
    response,
    `Initialization could not be started (HTTP ${response.status}). Please try again.`,
  )
}
