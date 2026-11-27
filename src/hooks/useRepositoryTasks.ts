import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { listTasks } from '@/services/taskService'
import type { FeatureItem } from '@/types/feature'
import type { TaskItem } from '@/types/task'

export type FeatureTasksStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unauthorized'

export interface FeatureTasksGroup {
  featureId: string
  status: FeatureTasksStatus
  tasks: TaskItem[]
  error: string | null
}

/**
 * Fetches `GET /api/tasks` once per feature for a repository. Groups stay keyed by stable
 * `feature_id` (not display name). Each group's task list keeps the API's oldest-first order.
 * A failed feature can be retried without clearing the other groups.
 */
export function useRepositoryTasks(
  enabled: boolean,
  username: string | null | undefined,
  repoUrl: string | null | undefined,
  features: FeatureItem[],
  reloadKey: string | number = 0,
) {
  const [groups, setGroups] = useState<FeatureTasksGroup[]>([])
  const controllersRef = useRef<Map<string, AbortController>>(new Map())
  const featureOrderRef = useRef<string[]>([])

  const abortAll = useCallback(() => {
    for (const controller of controllersRef.current.values()) controller.abort()
    controllersRef.current.clear()
  }, [])

  const fetchFeature = useCallback(
    (featureId: string, usernameValue: string, repoUrlValue: string) => {
      const previous = controllersRef.current.get(featureId)
      previous?.abort()

      const controller = new AbortController()
      controllersRef.current.set(featureId, controller)

      setGroups((prev) => {
        const without = prev.filter((group) => group.featureId !== featureId)
        const order = featureOrderRef.current
        const next: FeatureTasksGroup[] = [
          ...without,
          { featureId, status: 'loading', tasks: [], error: null },
        ]
        next.sort((a, b) => order.indexOf(a.featureId) - order.indexOf(b.featureId))
        return next
      })

      void (async () => {
        try {
          const list = await listTasks(usernameValue, repoUrlValue, featureId, controller.signal)
          if (controller.signal.aborted) return
          setGroups((prev) =>
            prev.map((group) =>
              group.featureId === featureId
                ? { featureId, status: 'ready', tasks: list.tasks, error: null }
                : group,
            ),
          )
        } catch (error) {
          if (isAbortError(error) || controller.signal.aborted) return
          if (error instanceof ApiError && error.status === 401) {
            setGroups((prev) =>
              prev.map((group) =>
                group.featureId === featureId
                  ? { featureId, status: 'unauthorized', tasks: [], error: null }
                  : group,
              ),
            )
            return
          }
          setGroups((prev) =>
            prev.map((group) =>
              group.featureId === featureId
                ? {
                    featureId,
                    status: 'error',
                    tasks: [],
                    error: "Couldn't load tasks",
                  }
                : group,
            ),
          )
        } finally {
          if (controllersRef.current.get(featureId) === controller) {
            controllersRef.current.delete(featureId)
          }
        }
      })()
    },
    [],
  )

  const retry = useCallback(
    (featureId: string) => {
      if (!enabled || !username || !repoUrl) return
      fetchFeature(featureId, username, repoUrl)
    },
    [enabled, username, repoUrl, fetchFeature],
  )

  const featureIdsKey = features.map((f) => f.feature_id).join(',')

  useEffect(() => {
    const featureIds = featureIdsKey.length > 0 ? featureIdsKey.split(',') : []
    featureOrderRef.current = featureIds

    if (!enabled || !username || !repoUrl) {
      abortAll()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when scope ends
      setGroups([])
      return
    }

    const activeIds = new Set(featureIds)

    for (const [id, controller] of controllersRef.current) {
      if (!activeIds.has(id)) {
        controller.abort()
        controllersRef.current.delete(id)
      }
    }

    setGroups((prev) => {
      const prevById = new Map(prev.map((g) => [g.featureId, g]))
      return featureIds.map((featureId) => {
        const existing = prevById.get(featureId)
        if (existing) return existing
        return {
          featureId,
          status: 'loading' as const,
          tasks: [] as TaskItem[],
          error: null,
        }
      })
    })

    for (const featureId of featureIds) {
      fetchFeature(featureId, username, repoUrl)
    }

    return () => {
      abortAll()
    }
  }, [enabled, username, repoUrl, featureIdsKey, reloadKey, fetchFeature, abortAll])

  return { groups, retry }
}
