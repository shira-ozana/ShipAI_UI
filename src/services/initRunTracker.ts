import { ApiError, isAbortError } from '@/lib/http'
import {
  createFeature,
  getInitRun,
  startInit,
  type InitPublishInfo,
} from '@/services/initService'

/**
 * Shared init run tracking for the list and details screens.
 *
 * At most one poll loop runs per repository key. Screens subscribe while mounted; when the last
 * subscriber leaves, polling stops. Remounting a screen with a remembered `runId` in `started`
 * resumes that poll without POSTing another run.
 *
 * The Platform Backend has no "active init run for this repository" endpoint, so a full page
 * reload cannot discover an in-flight run.
 */

export type InitPhase = 'idle' | 'creating_feature' | 'requesting' | 'started' | 'completed'

export interface InitState {
  phase: InitPhase
  runId: string | null
  error: string | null
  /** Filled when a run finishes with `result.output` publish fields. */
  publish: InitPublishInfo | null
}

export type InitListener = (state: InitState) => void

const INITIAL: InitState = { phase: 'idle', runId: null, error: null, publish: null }
const POLL_MS = 2000
const MAX_POLL_FAILURES = 3

interface Track {
  state: InitState
  featureId: string | null
  listeners: Set<InitListener>
  controller: AbortController | null
  busy: boolean
  pollFailures: number
}

const tracks = new Map<string, Track>()

export function initTrackKey(username: string, repoUrl: string): string {
  return `${username}\n${repoUrl}`
}

function getOrCreate(key: string): Track {
  let track = tracks.get(key)
  if (!track) {
    track = {
      state: { ...INITIAL },
      featureId: null,
      listeners: new Set(),
      controller: null,
      busy: false,
      pollFailures: 0,
    }
    tracks.set(key, track)
  }
  return track
}

function publish(track: Track) {
  const snapshot = track.state
  for (const listener of track.listeners) listener(snapshot)
}

function setState(track: Track, next: InitState) {
  track.state = next
  publish(track)
}

function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  return error.detail ? `${error.message} (${error.detail})` : error.message
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(
        signal.reason instanceof DOMException
          ? signal.reason
          : new DOMException('Aborted', 'AbortError'),
      )
      return
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(
        signal.reason instanceof DOMException
          ? signal.reason
          : new DOMException('Aborted', 'AbortError'),
      )
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function getInitTrackState(key: string): InitState {
  return tracks.get(key)?.state ?? { ...INITIAL }
}

/**
 * Subscribe to init state for a repository key. Returns an unsubscribe that drops this screen's
 * interest; when no subscribers remain, any in-flight poll for that key is aborted.
 */
export function subscribeInitTrack(key: string, listener: InitListener): () => void {
  const track = getOrCreate(key)
  track.listeners.add(listener)
  listener(track.state)
  // Remounted while a run was remembered as started: resume poll without a new POST.
  if (
    track.state.phase === 'started' &&
    track.state.runId &&
    !track.busy &&
    track.listeners.size === 1
  ) {
    void resumePoll(key)
  }
  return () => {
    track.listeners.delete(listener)
    if (track.listeners.size === 0) {
      track.controller?.abort()
      track.controller = null
      track.busy = false
    }
  }
}

async function resumePoll(key: string) {
  const track = tracks.get(key)
  if (!track || track.busy || track.state.phase !== 'started' || !track.state.runId) return
  if (track.listeners.size === 0) return

  const runId = track.state.runId
  track.busy = true
  track.pollFailures = 0
  const controller = new AbortController()
  track.controller = controller
  const { signal } = controller

  try {
    await pollUntilDone(track, runId, signal)
  } catch (error) {
    if (isAbortError(error)) return
    setState(track, {
      phase: 'idle',
      runId,
      error: describe(error),
      publish: null,
    })
  } finally {
    if (track.controller === controller) track.controller = null
    track.busy = false
  }
}

async function pollUntilDone(track: Track, runId: string, signal: AbortSignal) {
  while (!signal.aborted) {
    await sleep(POLL_MS, signal)
    try {
      const snapshot = await getInitRun(runId, signal)
      track.pollFailures = 0
      if (snapshot.status === 'running') continue
      if (snapshot.status === 'failed') {
        const detail =
          snapshot.publish?.summary ??
          snapshot.publish?.publishError ??
          'The backend reported that initialization failed.'
        setState(track, {
          phase: 'idle',
          runId,
          error: detail,
          publish: snapshot.publish,
        })
        return
      }
      setState(track, {
        phase: 'completed',
        runId,
        error: null,
        publish: snapshot.publish,
      })
      return
    } catch (error) {
      if (isAbortError(error)) throw error
      track.pollFailures += 1
      if (track.pollFailures >= MAX_POLL_FAILURES) {
        setState(track, {
          phase: 'idle',
          runId,
          error: describe(error),
          publish: null,
        })
        return
      }
    }
  }
}

/**
 * Start initialization for one repository. Duplicate calls while busy or after success are no-ops.
 * Failed runs leave phase `idle` with an error so the caller can retry.
 */
export async function startTrackedInit(
  key: string,
  username: string,
  repoUrl: string,
  associatedFeatureId: string | null = null,
): Promise<void> {
  const track = getOrCreate(key)
  if (track.busy || track.state.phase === 'completed') return
  if (track.state.phase === 'creating_feature' || track.state.phase === 'requesting') return
  if (track.state.phase === 'started') return

  track.busy = true
  track.pollFailures = 0
  const controller = new AbortController()
  track.controller?.abort()
  track.controller = controller
  const { signal } = controller

  let runId: string | null = null
  try {
    let featureId = associatedFeatureId?.trim() || track.featureId
    if (!featureId) {
      setState(track, { ...INITIAL, phase: 'creating_feature' })
      featureId = await createFeature(username, repoUrl, signal)
    }
    track.featureId = featureId

    setState(track, { ...INITIAL, phase: 'requesting' })
    runId = await startInit(featureId, repoUrl, signal)
    setState(track, { phase: 'started', runId, error: null, publish: null })

    await pollUntilDone(track, runId, signal)
  } catch (error) {
    if (isAbortError(error)) return
    setState(track, {
      phase: 'idle',
      runId,
      error: describe(error),
      publish: null,
    })
  } finally {
    if (track.controller === controller) track.controller = null
    track.busy = false
  }
}
