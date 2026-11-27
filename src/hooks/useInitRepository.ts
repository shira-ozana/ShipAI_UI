import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { createFeature, startInit } from '@/services/initService'

export type InitPhase =
  /** Nothing requested. Nothing happens until `start` is called. */
  | 'idle'
  /** `POST /api/features` is in flight. */
  | 'creating_feature'
  /** `POST /api/agents/init/run` is in flight. */
  | 'requesting'
  /** The backend accepted the run (202). Completion is not tracked: no status route is verified. */
  | 'started'

export interface InitState {
  phase: InitPhase
  runId: string | null
  /** Why the last attempt failed. Cleared when a new attempt starts. */
  error: string | null
}

const INITIAL: InitState = { phase: 'idle', runId: null, error: null }

function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  // The backend's own `detail` explains what to fix, so show it next to our message.
  return error.detail ? `${error.message} (${error.detail})` : error.message
}

/**
 * Owns the explicit "Init Repository" action for one repository URL and signed-in username.
 *
 * Nothing runs on mount or on prop changes: only `start()` (the button click) sends a POST.
 * Duplicate clicks are ignored while a request is in flight and after the run has started.
 *
 * Prefer `associatedFeatureId` when the screen already ties a feature to this repository.
 * Otherwise create one once per (username, repoUrl) and keep it, so retrying a failed init
 * request reuses that ID instead of creating a duplicate feature.
 */
export function useInitRepository(
  repoUrl: string,
  username: string | null,
  associatedFeatureId: string | null = null,
) {
  const [state, setState] = useState<InitState>(INITIAL)
  const busyRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const featureRef = useRef<{ key: string; id: string } | null>(null)

  // Abort an in-flight request when the screen goes away.
  useEffect(() => () => controllerRef.current?.abort(), [])

  const start = useCallback(async () => {
    if (busyRef.current || !username) return
    busyRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    const { signal } = controller
    const key = `${username}\n${repoUrl}`

    try {
      let featureId =
        associatedFeatureId?.trim() ||
        (featureRef.current?.key === key ? featureRef.current.id : null)
      if (!featureId) {
        setState({ ...INITIAL, phase: 'creating_feature' })
        featureId = await createFeature(username, repoUrl, signal)
      }
      featureRef.current = { key, id: featureId }

      setState({ ...INITIAL, phase: 'requesting' })
      const runId = await startInit(featureId, repoUrl, signal)
      setState({ phase: 'started', runId, error: null })
    } catch (error) {
      if (isAbortError(error)) return
      setState({ ...INITIAL, error: describe(error) })
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
      busyRef.current = false
    }
  }, [associatedFeatureId, repoUrl, username])

  const isBusy = state.phase === 'creating_feature' || state.phase === 'requesting'
  // Blocked while a request is in flight and once the run has started.
  const canStart = state.phase === 'idle'

  return { state, start, isBusy, canStart }
}
