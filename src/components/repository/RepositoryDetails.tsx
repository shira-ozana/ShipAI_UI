import { Loader2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useInitRepository, type InitState } from '@/hooks/useInitRepository'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { useAuth } from '@/context/auth-context'
import type { Repository } from '@/types/repository'

function InitStatus({ state }: { state: InitState }) {
  const { phase, runId, error } = state

  if (phase === 'creating_feature') {
    return <Alert role="status">Creating a feature for this repository…</Alert>
  }
  if (phase === 'requesting') {
    return <Alert role="status">Requesting initialization…</Alert>
  }
  if (phase === 'started') {
    return (
      <Alert variant="success" role="status">
        Initialization started (run <code>{runId}</code>). Completion is not tracked here yet.
      </Alert>
    )
  }
  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        {error}
      </Alert>
    )
  }
  return null
}

export function RepositoryDetails({
  repository,
  featureId = null,
}: {
  repository: Repository
  /** When the screen already associates a feature with this repository, reuse it for init. */
  featureId?: string | null
}) {
  const { status, user } = useAuth()
  const { state, start, isBusy, canStart } = useInitRepository(
    repository.repo_url,
    user?.username ?? null,
    featureId,
  )
  const disabled = !user || !canStart

  let label = 'Init Repository'
  if (state.phase === 'creating_feature') label = 'Creating feature…'
  else if (state.phase === 'requesting') label = 'Requesting…'
  else if (state.phase === 'started') label = 'Initialization started'

  return (
    <div className="grid gap-5">
      <dl className="grid gap-3 text-sm">
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Repository URL</dt>
          <dd className="font-medium break-all">{repository.repo_url}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">GitHub Username</dt>
          <dd className="font-medium">{repository.github_user}</dd>
        </div>
      </dl>

      <div className="grid gap-3">
        <Button type="button" onClick={() => void start()} disabled={disabled} aria-busy={isBusy}>
          {isBusy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {label}
        </Button>
        {status !== 'loading' && !user && (
          <SignInRequired message="Sign in to initialize this repository." />
        )}
        <InitStatus state={state} />
      </div>
    </div>
  )
}
