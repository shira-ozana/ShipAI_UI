import { Link, useLocation } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'

/**
 * Shown where a valid backend session is required. Leads to the working sign-in flow and
 * remembers where to come back to.
 */
export function SignInRequired({ message }: { message: string }) {
  const { status, error } = useAuth()
  const location = useLocation()

  if (status === 'error') {
    return (
      <Alert variant="destructive" role="alert">
        {error ?? 'Could not check the session.'}
      </Alert>
    )
  }

  return (
    <div className="grid gap-3">
      <Alert variant="warning" role="status">
        {message}
      </Alert>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild>
          <Link to="/sign-in" state={{ from: location.pathname }}>
            Sign in
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/register">Create an account</Link>
        </Button>
      </div>
    </div>
  )
}
