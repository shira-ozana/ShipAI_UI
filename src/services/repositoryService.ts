import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, getJson, postJson, unexpectedStatus } from '@/lib/http'
import type { AddRepositoryInput, RepositoriesList, Repository } from '@/types/repository'

const REPOSITORIES_URL = `${PLATFORM_API_URL}/api/repositories`

function isRepository(value: unknown): value is Repository {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.id === 'number' &&
    ['user_id', 'username', 'github_user', 'repo_url', 'created_at'].every(
      (key) => typeof body[key] === 'string',
    )
  )
}

function isRepositoriesList(value: unknown): value is RepositoriesList {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.username === 'string' &&
    Array.isArray(body.repositories) &&
    body.repositories.every(isRepository)
  )
}

/**
 * `GET /api/repositories`. Session cookie identifies the user; no username parameter.
 * Resolves with the signed-in user's repositories (oldest first) on `200`.
 */
export async function listRepositories(signal?: AbortSignal): Promise<RepositoriesList> {
  const response = await getJson(REPOSITORIES_URL, signal)

  if (response.status === 200) {
    if (!isRepositoriesList(response.body)) {
      throw new ApiError('The backend sent a response the app could not understand.', 200)
    }
    return response.body
  }
  if (response.status === 401) {
    throw unexpectedStatus(response, 'Your session has expired. Sign in again.')
  }
  throw unexpectedStatus(
    response,
    `Couldn't load repositories (HTTP ${response.status}). Please try again.`,
  )
}

/**
 * `POST /api/repositories`. Resolves with the created repository on `201`.
 * Adding a repository never starts initialization: that is a separate call (`initService`).
 *
 * `github_password` is the backend's name for the GitHub personal access token. The token
 * only lives in this request body.
 */
export async function createRepository(
  input: AddRepositoryInput,
  signal?: AbortSignal,
): Promise<Repository> {
  const response = await postJson(
    REPOSITORIES_URL,
    {
      username: input.username,
      github_user: input.github_user,
      github_password: input.github_password,
      repo_url: input.repo_url,
    },
    signal,
  )

  if (response.status === 201) {
    if (!isRepository(response.body)) {
      throw new ApiError('The backend sent a response the app could not understand.', 201)
    }
    return response.body
  }
  if (response.status === 404) {
    throw unexpectedStatus(
      response,
      'The backend does not know this ShipAI user. Register the user first.',
    )
  }
  if (response.status === 422) {
    throw unexpectedStatus(
      response,
      'The backend rejected some of the details. Check the URL, username and token.',
    )
  }
  throw unexpectedStatus(
    response,
    `The repository could not be added (HTTP ${response.status}). Please try again.`,
  )
}
