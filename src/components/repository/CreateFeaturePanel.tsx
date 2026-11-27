import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Loader2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCreateFeature } from '@/hooks/useCreateFeature'
import { githubRepoLabel } from '@/lib/validation'
import type { Repository } from '@/types/repository'

/**
 * New Feature for an already-selected repository. The Platform `POST /api/features` body only
 * accepts `username` and `repo_url`, so the repository is shown as selected and there are no
 * extra editable fields to preserve beyond that selection.
 */
export function CreateFeaturePanel({
  repository,
  username,
  onCreated,
}: {
  repository: Repository
  username: string
  /** Called after a feature is created so the features list can refresh. */
  onCreated?: () => void
}) {
  const { status, error, feature, isSubmitting, canSubmit, submit, reset } = useCreateFeature(
    username,
    repository.repo_url,
  )
  const label = githubRepoLabel(repository.repo_url)
  const notifiedId = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'success' || !feature) return
    if (notifiedId.current === feature.feature_id) return
    notifiedId.current = feature.feature_id
    onCreated?.()
  }, [status, feature, onCreated])

  if (status === 'success' && feature) {
    const featurePath = `/repositories/${repository.id}/features/${feature.feature_id}`
    return (
      <div className="grid gap-3">
        <Alert variant="success" role="status">
          Feature <code>{feature.feature_id}</code> was created for <strong>{label}</strong>.
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={featurePath}>Open feature</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`${featurePath}/tasks`}>Tasks</Link>
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            Create another feature
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Create a feature for <strong className="text-foreground">{label}</strong>. ShipAI associates
        it with this repository through <code>repo_url</code>.
      </p>
      {error && (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      )}
      <Button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit || isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Creating…' : 'New Feature'}
      </Button>
    </div>
  )
}
