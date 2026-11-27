import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { createFeatureRecord, type FeatureRecord } from '@/services/initService'

export interface CreateFeatureState {
  status: 'idle' | 'submitting' | 'success'
  error: string | null
  feature: FeatureRecord | null
}

const INITIAL: CreateFeatureState = { status: 'idle', error: null, feature: null }

function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  return error.detail ? `${error.message} (${error.detail})` : error.message
}

/**
 * Explicit "New Feature" for one already-selected repository. Submits `POST /api/features`
 * with `{ username, repo_url }`. Duplicate clicks are ignored while a request is in flight.
 * Entered context (the selected repository) is preserved on error.
 */
export function useCreateFeature(username: string | null, repoUrl: string) {
  const [state, setState] = useState<CreateFeatureState>(INITIAL)
  const busyRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    busyRef.current = false
    setState(INITIAL)
  }, [])

  const submit = useCallback(async () => {
    if (busyRef.current || !username) return
    busyRef.current = true
    const controller = new AbortController()
    controllerRef.current = controller
    setState((prev) => ({ ...prev, status: 'submitting', error: null }))

    try {
      const feature = await createFeatureRecord(username, repoUrl, controller.signal)
      setState({ status: 'success', error: null, feature })
    } catch (error) {
      if (isAbortError(error)) return
      setState((prev) => ({
        status: 'idle',
        error: describe(error),
        feature: prev.feature,
      }))
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
      busyRef.current = false
    }
  }, [repoUrl, username])

  return {
    ...state,
    isSubmitting: state.status === 'submitting',
    canSubmit: state.status === 'idle' && Boolean(username),
    submit,
    reset,
  }
}
