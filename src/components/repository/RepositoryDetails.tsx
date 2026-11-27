import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CreateFeaturePanel } from '@/components/repository/CreateFeaturePanel'
import { FeaturesListPanel } from '@/components/repository/FeaturesListPanel'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { useInitRepository, type InitState } from '@/hooks/useInitRepository'
import { initPublishMessage } from '@/lib/initPublishMessage'
import { githubRepoLabel } from '@/lib/validation'
import type { Repository } from '@/types/repository'

function InitStatus({ state }: { state: InitState }) {
  const { phase, runId, error, publish } = state
  const publishLine = initPublishMessage(publish)

  if (phase === 'creating_feature') {
    return <Alert role="status">Creating a feature for this repository…</Alert>
  }
  if (phase === 'requesting') {
    return <Alert role="status">Requesting initialization…</Alert>
  }
  if (phase === 'started') {
    return (
      <Alert variant="success" role="status">
        Initialization started (run <code>{runId}</code>). Waiting for the backend to finish…
      </Alert>
    )
  }
  if (phase === 'completed') {
    const warnPublish = Boolean(publish && !publish.pushed && (publish.publishError || publish.commit))
    return (
      <Alert variant={warnPublish ? 'destructive' : 'success'} role="status">
        Initialization completed (run <code>{runId}</code>).
        {publishLine ? <> {publishLine}</> : null}
      </Alert>
    )
  }
  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        {error}
        {runId ? (
          <>
            {' '}
            (run <code>{runId}</code>)
          </>
        ) : null}
      </Alert>
    )
  }
  return (
    <Alert role="status">
      Not initialized yet. The Platform API does not return a repository-level initialization
      status, so this screen only knows about runs started in the current browser session.
    </Alert>
  )
}

function initializationLabel(state: InitState): string {
  if (state.phase === 'creating_feature') return 'Creating feature…'
  if (state.phase === 'requesting') return 'Requesting…'
  if (state.phase === 'started') return 'Initializing…'
  if (state.phase === 'completed') return 'Initialized'
  if (state.error) return 'Retry initialization'
  return 'Init Repository'
}

export function RepositoryDetails({
  repository,
  featureId = null,
  listUsername = null,
}: {
  repository: Repository
  /** When the screen already associates a feature with this repository, reuse it for init. */
  featureId?: string | null
  /** Username from `GET /api/repositories`; preferred for feature/task query params. */
  listUsername?: string | null
}) {
  const { status, user } = useAuth()
  const [featuresReloadKey, setFeaturesReloadKey] = useState(0)
  const username = listUsername ?? user?.username ?? null
  const { state, start, isBusy, canStart } = useInitRepository(
    repository.repo_url,
    username,
    featureId,
  )
  const disabled = !user || !canStart
  const label = githubRepoLabel(repository.repo_url)
  const initialized = state.phase === 'completed'

  return (
    <div className="grid gap-6">
      <dl className="grid gap-3 text-sm">
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Repository</dt>
          <dd className="font-medium">{label}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Repository URL</dt>
          <dd className="font-medium break-all">{repository.repo_url}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">GitHub Username</dt>
          <dd className="font-medium">{repository.github_user}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Initialization</dt>
          <dd className="font-medium">
            {state.phase === 'completed'
              ? 'Initialized'
              : state.phase === 'started' ||
                  state.phase === 'requesting' ||
                  state.phase === 'creating_feature'
                ? 'Initializing…'
                : state.error
                  ? 'Failed'
                  : 'Not initialized'}
          </dd>
        </div>
      </dl>

      <div className="grid gap-3">
        <Button type="button" onClick={() => start()} disabled={disabled} aria-busy={isBusy}>
          {isBusy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {initializationLabel(state)}
        </Button>
        {status !== 'loading' && !user && (
          <SignInRequired message="Sign in to initialize this repository." />
        )}
        <InitStatus state={state} />
      </div>

      {user && username && initialized && (
        <section className="grid gap-3 border-t border-border pt-5">
          <h2 className="text-sm font-medium text-foreground">Features</h2>
          <FeaturesListPanel key={featuresReloadKey} repository={repository} username={username} />
          <CreateFeaturePanel
            repository={repository}
            username={username}
            onCreated={() => setFeaturesReloadKey((n) => n + 1)}
          />
        </section>
      )}

      {user && !initialized && (state.phase === 'started' || state.error) && (
        <Alert role="status">
          New Feature is available only after initialization succeeds for this repository in the
          current session.
        </Alert>
      )}
    </div>
  )
}
