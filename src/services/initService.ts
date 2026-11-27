import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, getJson, postJson, unexpectedStatus } from '@/lib/http'

/**
 * Initialization goes through the Platform Backend, on the same base URL (or Vite proxy) as
 * `/api/repositories` (local target `http://127.0.0.1:8000`):
 *
 *   POST /api/features                body `{ username, repo_url }`
 *                                     -> 201 `{ feature_id, username, repo_url, created_at }`
 *   POST /api/agents/init/run         body `{ feature_id, project: { repo_url }, dry_run: false }`
 *                                     -> 202 `{ runId, status: "running" }`
 *   GET  /api/agents/init/runs/{id}   -> `{ runId, status, result?: { output } }` (Platform forwards
 *                                     to the INIT agent). When finished, `result.output` may include
 *                                     `branch`, `commit`, `pushed`, `summary`, and `alerts`.
 *
 * Do not poll the old Generic Agent path `GET /api/init/{runId}` from the UI: that hits a
 * different Vite proxy target. Completion is reported only from the Platform status route.
 */
const FEATURES_URL = `${PLATFORM_API_URL}/api/features`
const INIT_RUN_URL = `${PLATFORM_API_URL}/api/agents/init/run`

const UNREADABLE = 'The backend sent a response the app could not understand.'

export type InitRunStatus = 'running' | 'completed' | 'completed_with_warnings' | 'failed'

/** Publish fields from `result.output` once an init run has finished. */
export interface InitPublishInfo {
  branch: string | null
  /** Commit SHA when the agent created a local commit. */
  commit: string | null
  pushed: boolean
  /** Backend publish failure reason when available (e.g. from alerts). */
  publishError: string | null
  summary: string | null
}

export interface InitRunSnapshot {
  runId: string
  status: InitRunStatus
  /** Present when the run has finished; used for failure messages and publish details. */
  publish: InitPublishInfo | null
}

/** `FeatureOut` from `POST /api/features`. The feature is tied to the repo by `repo_url`. */
export interface FeatureRecord {
  feature_id: string
  username: string
  repo_url: string
  created_at: string
}

function stringField(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null) return null
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function isInitRunStatus(value: unknown): value is InitRunStatus {
  return (
    value === 'running' ||
    value === 'completed' ||
    value === 'completed_with_warnings' ||
    value === 'failed'
  )
}

function outputFromBody(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null) return null
  const result = (body as Record<string, unknown>).result
  if (typeof result !== 'object' || result === null) return null
  const output = (result as Record<string, unknown>).output
  if (typeof output !== 'object' || output === null) return null
  return output as Record<string, unknown>
}

function publishErrorFromOutput(output: Record<string, unknown>): string | null {
  const direct = output.error
  if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim()

  const alerts = output.alerts
  if (!Array.isArray(alerts)) return null
  for (const item of alerts) {
    if (typeof item !== 'object' || item === null) continue
    const alert = item as Record<string, unknown>
    const reason = alert.reason
    if (typeof reason !== 'string' || reason.trim().length === 0) continue
    if (alert.kind === 'write_failure' && /publish failed/i.test(reason)) {
      return reason.trim()
    }
  }
  return null
}

function publishFromBody(body: unknown): InitPublishInfo | null {
  const output = outputFromBody(body)
  if (!output) return null

  const summary =
    typeof output.summary === 'string' && output.summary.trim().length > 0
      ? output.summary.trim()
      : null
  const branch =
    typeof output.branch === 'string' && output.branch.trim().length > 0
      ? output.branch.trim()
      : null
  const commit =
    typeof output.commit === 'string' && output.commit.trim().length > 0
      ? output.commit.trim()
      : null
  const pushed = output.pushed === true

  return {
    branch,
    commit,
    pushed,
    publishError: publishErrorFromOutput(output),
    summary,
  }
}

function initStatusUrl(runId: string): string {
  return `${PLATFORM_API_URL}/api/agents/init/runs/${encodeURIComponent(runId)}`
}

function isFeatureRecord(value: unknown): value is FeatureRecord {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.feature_id === 'string' &&
    body.feature_id.trim().length > 0 &&
    typeof body.username === 'string' &&
    typeof body.repo_url === 'string' &&
    typeof body.created_at === 'string'
  )
}

/**
 * `POST /api/features` for one repository. Resolves with the full `FeatureOut` on `201`.
 * Calling it again creates another feature; init retries should keep the returned ID.
 */
export async function createFeatureRecord(
  username: string,
  repoUrl: string,
  signal?: AbortSignal,
): Promise<FeatureRecord> {
  const response = await postJson(FEATURES_URL, { username, repo_url: repoUrl }, signal)

  if (response.status === 201) {
    if (!isFeatureRecord(response.body)) throw new ApiError(UNREADABLE, 201)
    return response.body
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

/**
 * `POST /api/features` for one repository. Resolves with the new `feature_id` on `201`.
 * Calling it again creates another feature, so callers must keep the returned ID.
 */
export async function createFeature(
  username: string,
  repoUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const record = await createFeatureRecord(username, repoUrl, signal)
  return record.feature_id
}

/** `POST /api/agents/init/run`. Resolves with the run id on `202`. */
export async function startInit(
  featureId: string,
  repoUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await postJson(
    INIT_RUN_URL,
    { feature_id: featureId, project: { repo_url: repoUrl }, dry_run: false },
    signal,
  )

  if (response.status === 202) {
    const runId = stringField(response.body, 'runId')
    const status = stringField(response.body, 'status')
    if (!runId || status !== 'running') throw new ApiError(UNREADABLE, 202)
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
  if (response.status === 503) {
    throw unexpectedStatus(
      response,
      'Initialization could not start: the INIT agent server is not reachable. ' +
        'Start it, then try again.',
    )
  }
  throw unexpectedStatus(
    response,
    `Initialization could not be started (HTTP ${response.status}). Please try again.`,
  )
}

/**
 * `GET /api/agents/init/runs/{runId}` via the Platform Backend.
 * Resolves with the run snapshot when the body is readable.
 */
export async function getInitRun(runId: string, signal?: AbortSignal): Promise<InitRunSnapshot> {
  const response = await getJson(initStatusUrl(runId), signal)

  if (response.status === 200) {
    const id = stringField(response.body, 'runId') ?? runId
    const status = (response.body as { status?: unknown } | null)?.status
    if (!isInitRunStatus(status)) throw new ApiError(UNREADABLE, 200)
    return { runId: id, status, publish: publishFromBody(response.body) }
  }
  if (response.status === 404) {
    throw unexpectedStatus(response, 'This initialization run was not found on the backend.')
  }
  throw unexpectedStatus(
    response,
    `Could not read initialization status (HTTP ${response.status}). Please try again.`,
  )
}
