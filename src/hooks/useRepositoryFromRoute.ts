import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router'
import { useAuth } from '@/context/auth-context'
import { useRepositories } from '@/hooks/useRepositories'
import type { Repository } from '@/types/repository'

function isRepository(value: unknown): value is Repository {
  if (typeof value !== 'object' || value === null) return false
  const repo = value as Record<string, unknown>
  return (
    typeof repo.id === 'number' &&
    typeof repo.repo_url === 'string' &&
    typeof repo.github_user === 'string'
  )
}

/**
 * Prefer navigation state (e.g. right after Add Repository) for an instant paint, then fall
 * back to `GET /api/repositories` filtered by the route id.
 */
function repositoryFromState(state: unknown, id: string | undefined): Repository | null {
  const candidate =
    typeof state === 'object' && state !== null
      ? (state as Record<string, unknown>).repository
      : null
  return isRepository(candidate) && String(candidate.id) === id ? candidate : null
}

/**
 * Resolves the repository for `/repositories/:id/...` routes the same way as the details page:
 * auth gate, list load, match by route id. Exposes list `username` for task/feature query params.
 */
export function useRepositoryFromRoute() {
  const { id } = useParams()
  const location = useLocation()
  const { status: authStatus, user, refresh } = useAuth()
  const fromState = repositoryFromState(location.state, id)
  const {
    status,
    repositories,
    username: listUsername,
    error,
    retry,
  } = useRepositories(authStatus === 'authenticated' && Boolean(user), location.key)

  useEffect(() => {
    if (status === 'unauthorized') {
      void refresh()
    }
  }, [status, refresh])

  const fromList =
    status === 'ready' ? (repositories.find((repo) => String(repo.id) === id) ?? null) : null
  const repository = fromList ?? fromState
  const username = listUsername ?? user?.username ?? null

  return {
    id,
    authStatus,
    user,
    status,
    repository,
    username,
    error,
    retry,
  }
}
