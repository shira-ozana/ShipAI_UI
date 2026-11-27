import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { listRepositories } from '@/services/repositoryService'
import type { Repository } from '@/types/repository'

export type RepositoriesStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unauthorized'

export interface RepositoriesState {
  status: RepositoriesStatus
  repositories: Repository[]
  username: string | null
  error: string | null
}

const INITIAL: RepositoriesState = {
  status: 'idle',
  repositories: [],
  username: null,
  error: null,
}

/**
 * Loads `GET /api/repositories` for the signed-in session. Fetches when `enabled` becomes true
 * (page entry while authenticated) and again whenever `reloadKey` changes, so returning from
 * the connection flow refreshes the list without a browser reload.
 */
export function useRepositories(enabled: boolean, reloadKey: string | number = 0) {
  const [state, setState] = useState<RepositoriesState>(INITIAL)
  const controllerRef = useRef<AbortController | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const retry = useCallback(() => {
    setRetryTick((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.abort()
      controllerRef.current = null
      // Reset so a later sign-in does not flash the previous user's list.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear list when session ends
      setState(INITIAL)
      return
    }

    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }))

    void (async () => {
      try {
        const list = await listRepositories(controller.signal)
        if (controller.signal.aborted) return
        setState({
          status: 'ready',
          repositories: list.repositories,
          username: list.username,
          error: null,
        })
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          setState({
            status: 'unauthorized',
            repositories: [],
            username: null,
            error: null,
          })
          return
        }
        setState({
          status: 'error',
          repositories: [],
          username: null,
          error: "Couldn't load repositories",
        })
      }
    })()

    return () => {
      controller.abort()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [enabled, reloadKey, retryTick])

  return { ...state, retry }
}
