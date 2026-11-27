import { SignInRequired } from '@/components/auth/SignInRequired'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { FeatureTasksGroup as FeatureTasksGroupState } from '@/hooks/useRepositoryTasks'
import { formatConnectedAt } from '@/lib/formatDate'
import type { FeatureItem } from '@/types/feature'

/**
 * Missing capability: there is no feature-level Implement flow in this frontend.
 * Only repository Init exists (`POST /api/agents/init/run` with `feature_id` +
 * `project.repo_url`, `dry_run: false`). Platform agents register only `init` — no
 * Implement/Developer agent client, review step, or confirmation UI to reuse.
 */
export const FEATURE_IMPLEMENT_MISSING =
  'Feature-level Implement is unavailable: no Implement agent API, review step, or confirmation UI exists (only repository Init via POST /api/agents/init/run).'

function featureHeading(feature: FeatureItem): string {
  // Platform FeatureItem has no separate display name; feature_id is the stable label.
  return feature.feature_id
}

export function FeatureTasksGroup({
  feature,
  group,
  onRetry,
  showGroupEmpty = true,
}: {
  feature: FeatureItem
  group: FeatureTasksGroupState
  onRetry: (featureId: string) => void
  /** When false, an empty ready group still shows the header + Implement only. */
  showGroupEmpty?: boolean
}) {
  const heading = featureHeading(feature)

  return (
    <section
      className="grid gap-3 border-b border-border pb-5 last:border-b-0 last:pb-0"
      aria-labelledby={`feature-tasks-${feature.feature_id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={`feature-tasks-${feature.feature_id}`}
          className="min-w-0 flex-1 text-sm font-medium break-all text-foreground"
        >
          <code>{heading}</code>
        </h2>
        <Button
          type="button"
          size="sm"
          disabled
          title={FEATURE_IMPLEMENT_MISSING}
          aria-label={`Implement ${heading} (unavailable)`}
        >
          Implement
        </Button>
      </div>

      {(group.status === 'idle' || group.status === 'loading') && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading tasks…
        </p>
      )}

      {group.status === 'unauthorized' && (
        <SignInRequired message="Your session has expired. Sign in to see tasks." />
      )}

      {group.status === 'error' && (
        <div className="grid gap-3">
          <Alert variant="destructive" role="alert">
            {group.error ?? "Couldn't load tasks"}
          </Alert>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRetry(feature.feature_id)}
          >
            Retry
          </Button>
        </div>
      )}

      {group.status === 'ready' && group.tasks.length === 0 && showGroupEmpty && (
        <Alert role="status">No tasks yet for this feature</Alert>
      )}

      {group.status === 'ready' && group.tasks.length > 0 && (
        <ul className="grid">
          {group.tasks.map((task) => (
            <li
              key={task.task_id}
              className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span className="font-medium break-all">
                <code>{task.task_id}</code>
              </span>
              <time dateTime={task.created_at} className="text-sm text-muted-foreground">
                Created {formatConnectedAt(task.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
