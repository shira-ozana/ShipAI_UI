import { Link, useParams } from 'react-router'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { FeatureNav } from '@/components/feature/FeatureNav'
import { PageLayout } from '@/components/layout/PageLayout'
import { FEATURE_IMPLEMENT_MISSING, FeatureTasksGroup } from '@/components/tasks/FeatureTasksGroup'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/hooks/useFeatures'
import { useRepositoryFromRoute } from '@/hooks/useRepositoryFromRoute'
import { useRepositoryTasks } from '@/hooks/useRepositoryTasks'
import { githubRepoLabel } from '@/lib/validation'

export default function TasksPage() {
  const { featureId } = useParams()
  const { id, authStatus, user, status, repository, username, error, retry } =
    useRepositoryFromRoute()
  const {
    status: featuresStatus,
    features,
    error: featuresError,
    retry: retryFeatures,
  } = useFeatures(
    Boolean(user && repository && username),
    username,
    repository?.repo_url,
    `${repository?.id ?? ''}:${username ?? ''}`,
  )
  const featuresReady = featuresStatus === 'ready'
  const { groups, retry: retryFeatureTasks } = useRepositoryTasks(
    Boolean(user && repository && username && featuresReady),
    username,
    repository?.repo_url,
    featuresReady ? features : [],
    `${username ?? ''}:${repository?.repo_url ?? ''}:${features.map((f) => f.feature_id).join(',')}`,
  )

  const feature =
    featuresReady && featureId
      ? (features.find((item) => item.feature_id === featureId) ?? null)
      : null

  const repoLabel = repository ? githubRepoLabel(repository.repo_url) : 'Repository'
  const groupsById = new Map(groups.map((group) => [group.featureId, group]))
  const allReady =
    featuresReady &&
    features.length > 0 &&
    features.every((item) => groupsById.get(item.feature_id)?.status === 'ready')
  const totalTasks = groups.reduce(
    (sum, group) => sum + (group.status === 'ready' ? group.tasks.length : 0),
    0,
  )
  const showRepoEmpty = allReady && totalTasks === 0

  return (
    <PageLayout title="Tasks" description={`Saved tasks for ${repoLabel}, grouped by feature.`}>
      {authStatus === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking your session…
        </p>
      )}
      {authStatus !== 'loading' && !user && (
        <SignInRequired message="Sign in to see tasks for this repository." />
      )}
      {user && !repository && (status === 'idle' || status === 'loading') && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading repository…
        </p>
      )}
      {user && status === 'unauthorized' && (
        <SignInRequired message="Your session has expired. Sign in to see tasks." />
      )}
      {user && status === 'error' && !repository && (
        <div className="grid gap-3">
          <Alert variant="destructive" role="alert">
            {error ?? "Couldn't load repositories"}
          </Alert>
          <Button type="button" variant="outline" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
      {user && status === 'ready' && !repository && (
        <div className="grid gap-4">
          <Alert variant="warning" role="status">
            Repository {id} was not found in your connected list.
          </Alert>
          <Button asChild variant="outline">
            <Link to="/repositories">Back to repositories</Link>
          </Button>
        </div>
      )}
      {user && repository && id && featureId && (
        <div className="grid gap-5">
          <FeatureNav repositoryId={id} featureId={featureId} />
          {(featuresStatus === 'idle' || featuresStatus === 'loading') && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading features…
            </p>
          )}
          {featuresStatus === 'unauthorized' && (
            <SignInRequired message="Your session has expired. Sign in to see tasks." />
          )}
          {featuresStatus === 'error' && (
            <div className="grid gap-3">
              <Alert variant="destructive" role="alert">
                {featuresError ?? "Couldn't load features"}
              </Alert>
              <Button type="button" variant="outline" onClick={retryFeatures}>
                Retry
              </Button>
            </div>
          )}
          {featuresStatus === 'ready' && !feature && (
            <div className="grid gap-4">
              <Alert variant="warning" role="status">
                Feature <code>{featureId}</code> was not found for this repository.
              </Alert>
              <Button asChild variant="outline">
                <Link to={`/repositories/${id}`}>Back to repository</Link>
              </Button>
            </div>
          )}
          {featuresStatus === 'ready' && feature && (
            <>
              <Alert role="status">{FEATURE_IMPLEMENT_MISSING}</Alert>
              {features.length === 0 && <Alert role="status">No tasks yet</Alert>}
              {showRepoEmpty && <Alert role="status">No tasks yet</Alert>}
              {features.length > 0 && (
                <div className="grid gap-5">
                  {features.map((item) => {
                    const group = groupsById.get(item.feature_id) ?? {
                      featureId: item.feature_id,
                      status: 'loading' as const,
                      tasks: [],
                      error: null,
                    }
                    return (
                      <FeatureTasksGroup
                        key={item.feature_id}
                        feature={item}
                        group={group}
                        onRetry={retryFeatureTasks}
                        showGroupEmpty={!showRepoEmpty}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageLayout>
  )
}
