import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { listTasks } from '@/services/taskService'
import type { TaskItem } from '@/types/task'

export type TasksStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unauthorized'

export interface TasksState {
  status: TasksStatus
  tasks: TaskItem[]
  error: string | null
}

const INITIAL: TasksState = {
  status: 'idle',
  tasks: [],
  error: null,
}

/**
 * Loads `GET /api/tasks` for one username + repo_url + feature_id. Fetches only when all three
 * are available. The in-memory result is scoped to that triple so switching features never
 * shows the previous feature's tasks.
 */
export function useTasks(
  enabled: boolean,
  username: string | null | undefined,
  repoUrl: string | null | undefined,
  featureId: string | null | undefined,
  reloadKey: string | number = 0,
) {
  const [state, setState] = useState<TasksState>(INITIAL)
  const controllerRef = useRef<AbortController | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  const retry = useCallback(() => {
    setRetryTick((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !username || !repoUrl || !featureId) {
      controllerRef.current?.abort()
      controllerRef.current = null
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when scope ends
      setState(INITIAL)
      return
    }

    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    // Clear immediately so a previous feature's tasks cannot remain visible while loading.
    setState({
      status: 'loading',
      tasks: [],
      error: null,
    })

    void (async () => {
      try {
        const list = await listTasks(username, repoUrl, featureId, controller.signal)
        if (controller.signal.aborted) return
        setState({
          status: 'ready',
          tasks: list.tasks,
          error: null,
        })
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          setState({
            status: 'unauthorized',
            tasks: [],
            error: null,
          })
          return
        }
        setState({
          status: 'error',
          tasks: [],
          error: "Couldn't load tasks",
        })
      }
    })()

    return () => {
      controller.abort()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [enabled, username, repoUrl, featureId, reloadKey, retryTick])

  return { ...state, retry }
}
