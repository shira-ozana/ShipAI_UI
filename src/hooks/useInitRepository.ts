import { useCallback, useEffect, useState } from 'react'
import {
  getInitTrackState,
  initTrackKey,
  startTrackedInit,
  subscribeInitTrack,
  type InitState,
} from '@/services/initRunTracker'

export type { InitPhase, InitState } from '@/services/initRunTracker'

const IDLE: InitState = { phase: 'idle', runId: null, error: null, publish: null }

/**
 * Owns the explicit "Init Repository" / "Initialize" action for one repository URL and
 * signed-in username. State is shared across list and details via `initRunTracker`, so only
 * one poll loop runs per repository and remounting resumes an in-memory started run.
 *
 * Nothing POSTs on mount: only `start()` (a button click) begins a new run.
 */
export function useInitRepository(
  repoUrl: string,
  username: string | null,
  associatedFeatureId: string | null = null,
) {
  const key = username ? initTrackKey(username, repoUrl) : null
  const [state, setState] = useState<InitState>(() => (key ? getInitTrackState(key) : IDLE))

  useEffect(() => {
    if (!key) return
    return subscribeInitTrack(key, setState)
  }, [key])

  const start = useCallback(() => {
    if (!username || !key) return
    void startTrackedInit(key, username, repoUrl, associatedFeatureId)
  }, [associatedFeatureId, key, repoUrl, username])

  const view = key ? state : IDLE
  const isBusy =
    view.phase === 'creating_feature' || view.phase === 'requesting' || view.phase === 'started'
  // Blocked while a request/poll is in flight and once the run has completed.
  const canStart = Boolean(key) && view.phase === 'idle'

  return { state: view, start, isBusy, canStart }
}
