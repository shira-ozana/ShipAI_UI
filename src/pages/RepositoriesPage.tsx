import { useCallback, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { Loader2 } from 'lucide-react'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { PageLayout } from '@/components/layout/PageLayout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { useInitRepository } from '@/hooks/useInitRepository'
import { useRepositories } from '@/hooks/useRepositories'
import { formatConnectedAt } from '@/lib/formatDate'
import { initPublishMessage } from '@/lib/initPublishMessage'
import { githubRepoLabel } from '@/lib/validation'
import type { Repository } from '@/types/repository'

function RepositoryRow({
  repository,
  username,
  onInitialized,
}: {
  repository: Repository
  username: string
  onInitialized: (runId: string) => void
}) {
  const label = githubRepoLabel(repository.repo_url)
  const { state, start, isBusy, canStart } = useInitRepository(repository.repo_url, username)
  const notifiedRunId = useRef<string | null>(null)

  useEffect(() => {
    if (state.phase !== 'completed' || !state.runId) return
    if (notifiedRunId.current === state.runId) return
    notifiedRunId.current = state.runId
    onInitialized(state.runId)
  }, [onInitialized, state.phase, state.runId])

  let actionLabel = 'Initialize'
  if (state.phase === 'creating_feature' || state.phase === 'requesting') {
    actionLabel = 'Initializing…'
  } else if (state.phase === 'started') {
    actionLabel = 'Initializing…'
  } else if (state.phase === 'completed') {
    actionLabel = 'Initialized'
  } else if (state.error) {
    actionLabel = 'Retry'
  }
  const publishLine =
    state.phase === 'completed' ? initPublishMessage(state.publish) : null

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="grid min-w-0 gap-1">
        <Link
          to={`/repositories/${repository.id}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {label}
        </Link>
        <time dateTime={repository.created_at} className="text-sm text-muted-foreground">
          Connected {formatConnectedAt(repository.created_at)}
        </time>
        {state.error && state.phase === 'idle' && (
          <Alert variant="destructive" role="alert" className="mt-1">
            {state.error}
          </Alert>
        )}
        {state.phase === 'started' && state.runId && (
          <p role="status" className="text-sm text-muted-foreground">
            Run <code>{state.runId}</code>
          </p>
        )}
        {publishLine && (
          <p
            role="status"
            className={
              state.publish && !state.publish.pushed
                ? 'text-sm text-destructive'
                : 'text-sm text-muted-foreground'
            }
          >
            {publishLine}
          </p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant={state.phase === 'completed' ? 'outline' : 'default'}
        className="shrink-0 self-start sm:self-center"
        onClick={() => start()}
        disabled={!canStart}
        aria-busy={isBusy}
      >
        {isBusy && <Loader2 className="animate-spin" aria-hidden="true" />}
        {actionLabel}
      </Button>
    </li>
  )
}

export default function RepositoriesPage() {
  const location = useLocation()
  const { status: authStatus, user, refresh } = useAuth()
  const { status, repositories, error, retry } = useRepositories(
    authStatus === 'authenticated' && Boolean(user),
    // Remount-driven refresh: navigating back here (e.g. after Add repository) reloads the list.
    location.key,
  )

  // Keep rows mounted across soft refreshes so an in-flight init poll on another row is not aborted.
  const showInitialLoading =
    user && (status === 'idle' || status === 'loading') && repositories.length === 0
  const showList = user && repositories.length > 0 && (status === 'ready' || status === 'loading')

  const refreshedRuns = useRef(new Set<string>())
  const handleInitialized = useCallback(
    (runId: string) => {
      if (refreshedRuns.current.has(runId)) return
      refreshedRuns.current.add(runId)
      retry()
    },
    [retry],
  )

  useEffect(() => {
    if (status === 'unauthorized') {
      void refresh()
    }
  }, [status, refresh])

  return (
    <PageLayout
      title="Repositories"
      description="GitHub repositories connected to your ShipAI account."
    >
      {authStatus === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking your session…
        </p>
      )}
      {authStatus !== 'loading' && !user && (
        <SignInRequired message="Sign in to see your connected repositories." />
      )}
      {showInitialLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading repositories…
        </p>
      )}
      {user && status === 'unauthorized' && (
        <SignInRequired message="Your session has expired. Sign in to see your repositories." />
      )}
      {user && status === 'error' && repositories.length === 0 && (
        <div className="grid gap-3">
          <Alert variant="destructive" role="alert">
            {error ?? "Couldn't load repositories"}
          </Alert>
          <Button type="button" variant="outline" onClick={retry}>
            Retry
          </Button>
        </div>
      )}
      {user && status === 'ready' && repositories.length === 0 && (
        <div className="grid gap-3">
          <Alert role="status">No repositories connected yet</Alert>
          <Button asChild>
            <Link to="/repositories/new">Add a repository</Link>
          </Button>
        </div>
      )}
      {user && showList && (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Signed in as <strong className="text-foreground">{user.username}</strong>
          </p>
          <ul className="grid">
            {repositories.map((repository) => (
              <RepositoryRow
                key={repository.id}
                repository={repository}
                username={user.username}
                onInitialized={handleInitialized}
              />
            ))}
          </ul>
          <Button asChild variant="outline">
            <Link to="/repositories/new">Add a repository</Link>
          </Button>
        </div>
      )}
    </PageLayout>
  )
}
