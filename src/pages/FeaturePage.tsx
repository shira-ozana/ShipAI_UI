import { Link, useParams } from 'react-router'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { FeatureNav } from '@/components/feature/FeatureNav'
import { PageLayout } from '@/components/layout/PageLayout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/hooks/useFeatures'
import { useRepositoryFromRoute } from '@/hooks/useRepositoryFromRoute'
import { formatConnectedAt } from '@/lib/formatDate'
import { githubRepoLabel } from '@/lib/validation'

export default function FeaturePage() {
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

  const feature =
    featuresStatus === 'ready' && featureId
      ? (features.find((item) => item.feature_id === featureId) ?? null)
      : null

  const repoLabel = repository ? githubRepoLabel(repository.repo_url) : 'Repository'
  const title = featureId ? `Feature ${featureId.slice(0, 8)}…` : 'Feature'

  return (
    <PageLayout title={title} description={`Feature for ${repoLabel}.`}>
      {authStatus === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking your session…
        </p>
      )}
      {authStatus !== 'loading' && !user && (
        <SignInRequired message="Sign in to open this feature." />
      )}
      {user && !repository && (status === 'idle' || status === 'loading') && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading repository…
        </p>
      )}
      {user && status === 'unauthorized' && (
        <SignInRequired message="Your session has expired. Sign in to open this feature." />
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
              Loading feature…
            </p>
          )}
          {featuresStatus === 'unauthorized' && (
            <SignInRequired message="Your session has expired. Sign in to open this feature." />
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
            <dl className="grid gap-3 text-sm">
              <div className="grid gap-1">
                <dt className="text-muted-foreground">Feature</dt>
                <dd className="font-medium break-all">
                  <code>{feature.feature_id}</code>
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-muted-foreground">Repository</dt>
                <dd className="font-medium">{repoLabel}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  <time dateTime={feature.created_at}>{formatConnectedAt(feature.created_at)}</time>
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </PageLayout>
  )
}
