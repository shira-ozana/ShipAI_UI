/**
 * `TaskItem` from `GET /api/tasks`.
 * Platform tasks expose only `task_id` and `created_at` (no title, status, or component).
 */
export interface TaskItem {
  task_id: string
  created_at: string
}

/** Response of `GET /api/tasks`. Tasks are oldest first; keep that order in the UI. */
export interface TasksList {
  username: string
  repo_url: string
  feature_id: string
  tasks: TaskItem[]
}
