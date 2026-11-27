import { Link } from 'react-router'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useFeatures } from '@/hooks/useFeatures'
import { formatConnectedAt } from '@/lib/formatDate'
import type { Repository } from '@/types/repository'

/**
 * Lists saved features for this repository (`GET /api/features`) and links each row to the
 * feature screen (Overview / Tasks).
 */
export function FeaturesListPanel({
  repository,
  username,
}: {
  repository: Repository
  username: string
}) {
  const { status, features, error, retry } = useFeatures(
    true,
    username,
    repository.repo_url,
    `${repository.id}:${username}`,
  )

  if (status === 'idle' || status === 'loading') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading features…
      </p>
    )
  }

  if (status === 'unauthorized') {
    return <SignInRequired message="Your session has expired. Sign in to see features." />
  }

  if (status === 'error') {
    return (
      <div className="grid gap-3">
        <Alert variant="destructive" role="alert">
          {error ?? "Couldn't load features"}
        </Alert>
        <Button type="button" variant="outline" onClick={retry}>
          Retry
        </Button>
      </div>
    )
  }

  if (features.length === 0) {
    return <Alert role="status">No features yet</Alert>
  }

  return (
    <ul className="grid">
      {features.map((feature) => (
        <li
          key={feature.feature_id}
          className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
        >
          <Link
            to={`/repositories/${repository.id}/features/${feature.feature_id}`}
            className="font-medium break-all text-foreground underline-offset-4 hover:underline"
          >
            <code>{feature.feature_id}</code>
          </Link>
          <time dateTime={feature.created_at} className="text-sm text-muted-foreground">
            Created {formatConnectedAt(feature.created_at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
