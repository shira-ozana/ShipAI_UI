import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, getJson, unexpectedStatus } from '@/lib/http'
import type { TaskItem, TasksList } from '@/types/task'

const TASKS_URL = `${PLATFORM_API_URL}/api/tasks`

function isTaskItem(value: unknown): value is TaskItem {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return typeof body.task_id === 'string' && typeof body.created_at === 'string'
}

function isTasksList(value: unknown): value is TasksList {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    typeof body.username === 'string' &&
    typeof body.repo_url === 'string' &&
    typeof body.feature_id === 'string' &&
    Array.isArray(body.tasks) &&
    body.tasks.every(isTaskItem)
  )
}

/**
 * `GET /api/tasks?username=&repo_url=&feature_id=`. Resolves with the tasks for that feature
 * (oldest first by `created_at`) on `200`.
 */
export async function listTasks(
  username: string,
  repoUrl: string,
  featureId: string,
  signal?: AbortSignal,
): Promise<TasksList> {
  const url = `${TASKS_URL}?${new URLSearchParams({
    username,
    repo_url: repoUrl,
    feature_id: featureId,
  })}`
  const response = await getJson(url, signal)

  if (response.status === 200) {
    if (!isTasksList(response.body)) {
      throw new ApiError('The backend sent a response the app could not understand.', 200)
    }
    return response.body
  }
  if (response.status === 401) {
    throw unexpectedStatus(response, 'Your session has expired. Sign in again.')
  }
  throw unexpectedStatus(
    response,
    `Couldn't load tasks (HTTP ${response.status}). Please try again.`,
  )
}
