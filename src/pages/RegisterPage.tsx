import { type FormEvent, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageLayout } from '@/components/layout/PageLayout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { isEmail } from '@/lib/validation'
import { useAuth } from '@/context/auth-context'
import { registerUser, UserConflictError } from '@/services/userService'
import type { RegisterInput } from '@/types/repository'
import { ApiError } from '@/lib/http'

type Errors = Partial<Record<keyof RegisterInput, string>>

const EMPTY: RegisterInput = { first_name: '', last_name: '', email: '', username: '' }

function validate(values: RegisterInput): Errors {
  const errors: Errors = {}
  if (!values.first_name) errors.first_name = 'First name is required.'
  if (!values.last_name) errors.last_name = 'Last name is required.'
  if (!values.email) errors.email = 'Email is required.'
  else if (!isEmail(values.email)) errors.email = 'Enter a valid email address.'
  if (!values.username) errors.username = 'ShipAI username is required.'
  return errors
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [values, setValues] = useState<RegisterInput>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  function update(field: keyof RegisterInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current) return

    const trimmed: RegisterInput = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      username: values.username.trim(),
    }
    const found = validate(trimmed)
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length > 0) return

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      await registerUser(trimmed)
      // The backend started a session for the new account. Confirm it with the backend before
      // leaving, so Add Repository never opens in a signed-out state.
      const user = await refresh()
      if (!user) {
        setSubmitError(
          'Your account was created, but the browser did not keep the session. ' +
            'Enable cookies and use Sign in.',
        )
        return
      }
      navigate('/repositories/new')
    } catch (error) {
      if (error instanceof UserConflictError) {
        setSubmitError(`${error.message} If it is yours, use Sign in.`)
      } else if (error instanceof ApiError) {
        setSubmitError(error.detail ? `${error.message} (${error.detail})` : error.message)
      } else setSubmitError('Something went wrong. Please try again.')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <PageLayout
      title="Create your ShipAI account"
      description="Register once, then add the repositories you want ShipAI to work on."
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-4" aria-busy={isSubmitting}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First Name"
            name="first_name"
            autoComplete="given-name"
            maxLength={100}
            value={values.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            error={errors.first_name}
            disabled={isSubmitting}
          />
          <FormField
            label="Last Name"
            name="last_name"
            autoComplete="family-name"
            maxLength={100}
            value={values.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            error={errors.last_name}
            disabled={isSubmitting}
          />
        </div>
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
        />
        <FormField
          label="ShipAI Username"
          name="username"
          autoComplete="username"
          maxLength={100}
          value={values.username}
          onChange={(e) => update('username', e.target.value)}
          error={errors.username}
          disabled={isSubmitting}
        />
        {submitError && (
          <Alert variant="destructive" role="alert">
            {submitError}
          </Alert>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering…' : 'Register'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/sign-in" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </PageLayout>
  )
}
