import { Link } from 'react-router'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { PageLayout } from '@/components/layout/PageLayout'
import { RepositoryDetails } from '@/components/repository/RepositoryDetails'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useRepositoryFromRoute } from '@/hooks/useRepositoryFromRoute'
import { githubRepoLabel } from '@/lib/validation'

export default function RepositoryDetailsPage() {
  const { id, authStatus, user, status, repository, username, error, retry } =
    useRepositoryFromRoute()

  const title = repository ? githubRepoLabel(repository.repo_url) : 'Repository details'

  return (
    <PageLayout title={title} description="Repository details and initialization.">
      {authStatus === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking your session…
        </p>
      )}
      {authStatus !== 'loading' && !user && (
        <SignInRequired message="Sign in to open this repository." />
      )}
      {user && !repository && (status === 'idle' || status === 'loading') && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading repository…
        </p>
      )}
      {user && status === 'unauthorized' && (
        <SignInRequired message="Your session has expired. Sign in to open this repository." />
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
            Repository {id} was not found in your connected list. There is no{' '}
            <code>GET /api/repositories/{'{id}'}</code>; this screen loads the selected repository
            from <code>GET /api/repositories</code> by matching the route id.
          </Alert>
          <Button asChild variant="outline">
            <Link to="/repositories">Back to repositories</Link>
          </Button>
        </div>
      )}
      {user && repository && (
        <RepositoryDetails key={repository.id} repository={repository} listUsername={username} />
      )}
    </PageLayout>
  )
}
