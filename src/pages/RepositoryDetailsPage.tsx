import { Link, useLocation, useParams } from 'react-router'
import { PageLayout } from '@/components/layout/PageLayout'
import { RepositoryDetails } from '@/components/repository/RepositoryDetails'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { Repository } from '@/types/repository'

function isRepository(value: unknown): value is Repository {
  if (typeof value !== 'object' || value === null) return false
  const repo = value as Record<string, unknown>
  return (
    typeof repo.id === 'number' &&
    typeof repo.repo_url === 'string' &&
    typeof repo.github_user === 'string'
  )
}

/**
 * The backend has no `GET /api/repositories/{id}`, so the details come from the creation
 * response that `AddRepositoryPage` passes along in the navigation state. Browsers keep that
 * state across a reload, but a direct visit to the URL has none.
 */
function repositoryFromState(state: unknown, id: string | undefined): Repository | null {
  const candidate =
    typeof state === 'object' && state !== null
      ? (state as Record<string, unknown>).repository
      : null
  return isRepository(candidate) && String(candidate.id) === id ? candidate : null
}

export default function RepositoryDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const repository = repositoryFromState(location.state, id)

  if (!repository) {
    return (
      <PageLayout title="Repository details">
        <div className="grid gap-4">
          <Alert variant="warning" role="status">
            Repository {id} cannot be loaded here. The backend has no endpoint to read a repository
            by ID (<code>GET /api/repositories/{'{id}'}</code>), so details are only available right
            after adding it.
          </Alert>
          <Button asChild variant="outline">
            <Link to="/repositories/new">Add a repository</Link>
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Repository details">
      <RepositoryDetails key={repository.id} repository={repository} />
    </PageLayout>
  )
}
