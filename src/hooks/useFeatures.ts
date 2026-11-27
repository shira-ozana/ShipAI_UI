import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { listFeatures } from '@/services/featureService'
import type { FeatureItem } from '@/types/feature'

export type FeaturesStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unauthorized'

export interface FeaturesState {
  status: FeaturesStatus
  features: FeatureItem[]
  error: string | null
}

const INITIAL: FeaturesState = {
  status: 'idle',
  features: [],
  error: null,
}

/**
 * Loads `GET /api/features` for one username + repo_url. Fetches when `enabled` and both
 * values are set; re-fetches when they or `reloadKey` change. Clears the previous list when
 * the repo scope changes so another repository's features never flash.
 */
export function useFeatures(
  enabled: boolean,
  username: string | null | undefined,
  repoUrl: string | null | undefined,
  reloadKey: string | number = 0,
) {
  const [state, setState] = useState<FeaturesState>(INITIAL)
  const controllerRef = useRef<AbortController | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const retry = useCallback(() => {
    setRetryTick((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !username || !repoUrl) {
      controllerRef.current?.abort()
      controllerRef.current = null
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when scope ends
      setState(INITIAL)
      return
    }

    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setState({
      status: 'loading',
      features: [],
      error: null,
    })

    void (async () => {
      try {
        const list = await listFeatures(username, repoUrl, controller.signal)
        if (controller.signal.aborted) return
        setState({
          status: 'ready',
          features: list.features,
          error: null,
        })
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          setState({
            status: 'unauthorized',
            features: [],
            error: null,
          })
          return
        }
        setState({
          status: 'error',
          features: [],
          error: "Couldn't load features",
        })
      }
    })()

    return () => {
      controller.abort()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [enabled, username, repoUrl, reloadKey, retryTick])

  return { ...state, retry }
}
