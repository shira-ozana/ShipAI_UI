import { type FormEvent, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { PageLayout } from '@/components/layout/PageLayout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/http'
import {
  InvalidCodeError,
  requestSignInCode,
  type SignInChallenge,
  verifySignInCode,
} from '@/services/authService'

const DEFAULT_NEXT = '/repositories/new'

function nextPath(state: unknown): string {
  const from =
    typeof state === 'object' && state !== null ? (state as Record<string, unknown>).from : null
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : DEFAULT_NEXT
}

function describe(error: unknown): string {
  if (error instanceof InvalidCodeError) return error.message
  if (error instanceof ApiError) {
    return error.detail ? `${error.message} (${error.detail})` : error.message
  }
  return 'Something went wrong. Please try again.'
}

/**
 * Sign-in for an existing account. Typing a username is not enough: the backend emails a
 * one-time code to the address on the account, and only that code starts a session.
 */
export default function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, refresh } = useAuth()
  const next = nextPath(location.state)

  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<SignInChallenge | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  // Set after our own successful sign-in so the redirect below does not race `navigate`.
  const [justSignedIn, setJustSignedIn] = useState(false)

  if (status === 'authenticated' && !justSignedIn) return <Navigate to={next} replace />

  async function handleRequest(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current) return
    const trimmed = identifier.trim()
    if (!trimmed) {
      setError('Enter your ShipAI username or email.')
      return
    }
    submittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      setChallenge(await requestSignInCode(trimmed))
      setCode('')
    } catch (caught) {
      setError(describe(caught))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current || !challenge) return
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Enter the code from your email.')
      return
    }
    submittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      await verifySignInCode(challenge.challenge, trimmed)
      // Trust only what the backend session says, not the sign-in response.
      const user = await refresh()
      if (!user) {
        setError('Signed in, but the browser did not keep the session. Enable cookies and retry.')
        return
      }
      setJustSignedIn(true)
      navigate(next, { replace: true })
    } catch (caught) {
      setError(describe(caught))
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  if (!challenge) {
    return (
      <PageLayout
        title="Sign in"
        description="We email a one-time code to the address on your ShipAI account."
      >
        <form onSubmit={handleRequest} noValidate className="grid gap-4" aria-busy={isSubmitting}>
          <FormField
            label="ShipAI username or email"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              setError(null)
            }}
            disabled={isSubmitting}
          />
          {error && (
            <Alert variant="destructive" role="alert">
              {error}
            </Alert>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending code…' : 'Email me a code'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/register" className="text-foreground underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </form>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Enter your code" description="Check your inbox for a 6-digit code.">
      <form onSubmit={handleVerify} noValidate className="grid gap-4" aria-busy={isSubmitting}>
        <Alert role="status">
          If an account matches <strong>{identifier.trim()}</strong>, a code was sent to its email
          address. It expires in {Math.round(challenge.expiresIn / 60)} minutes.
        </Alert>
        <FormField
          label="Sign-in code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(null)
          }}
          disabled={isSubmitting}
        />
        {error && (
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying…' : 'Sign in'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isSubmitting}
          onClick={() => {
            setChallenge(null)
            setError(null)
          }}
        >
          Use a different account or resend the code
        </Button>
      </form>
    </PageLayout>
  )
}
