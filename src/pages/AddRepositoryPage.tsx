import { type FormEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { SignInRequired } from '@/components/auth/SignInRequired'
import { PageLayout } from '@/components/layout/PageLayout'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/http'
import { isGithubRepoUrl } from '@/lib/validation'
import { createRepository } from '@/services/repositoryService'

interface Values {
  repo_url: string
  github_user: string
  token: string
}

type Errors = Partial<Record<keyof Values, string>>

const EMPTY: Values = { repo_url: '', github_user: '', token: '' }

export default function AddRepositoryPage() {
  const navigate = useNavigate()
  const { status, user, refresh } = useAuth()
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  function update(field: keyof Values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current || !user) return

    const repoUrl = values.repo_url.trim()
    const githubUser = values.github_user.trim()
    const token = values.token.trim()

    const found: Errors = {}
    if (!repoUrl) found.repo_url = 'Repository URL is required.'
    else if (!isGithubRepoUrl(repoUrl)) {
      found.repo_url = 'Enter a GitHub repository URL, for example https://github.com/owner/repo.'
    }
    if (!githubUser) found.github_user = 'GitHub username is required.'
    if (!token) found.token = 'GitHub personal access token is required.'
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length > 0) return

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const repository = await createRepository({
        username: user.username,
        github_user: githubUser,
        github_password: token,
        repo_url: repoUrl,
      })
      // Drop the token from the form before leaving. Adding ends here: initialization is a
      // separate, explicit action on the details screen.
      setValues(EMPTY)
      navigate(`/repositories/${repository.id}`, { state: { repository } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await refresh()
        setSubmitError(null)
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
      title="Add a repository"
      description="Connect a GitHub repository. ShipAI stores the token encrypted and never shows it again."
    >
      {status === 'loading' && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking your session…
        </p>
      )}
      {status !== 'loading' && !user && <SignInRequired message="Sign in to add a repository." />}
      {user && (
        <form onSubmit={handleSubmit} noValidate className="grid gap-4" aria-busy={isSubmitting}>
          <p className="text-sm text-muted-foreground">
            Signed in as <strong className="text-foreground">{user.username}</strong>
          </p>
          <fieldset disabled={isSubmitting} className="grid gap-4">
            <FormField
              label="Repository URL"
              name="repo_url"
              type="url"
              autoComplete="off"
              placeholder="https://github.com/owner/repo"
              value={values.repo_url}
              onChange={(e) => update('repo_url', e.target.value)}
              error={errors.repo_url}
            />
            <FormField
              label="GitHub Username"
              name="github_user"
              autoComplete="off"
              maxLength={100}
              value={values.github_user}
              onChange={(e) => update('github_user', e.target.value)}
              error={errors.github_user}
            />
            <FormField
              label="GitHub Personal Access Token"
              name="github_token"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={values.token}
              onChange={(e) => update('token', e.target.value)}
              error={errors.token}
              hint="Used only to add this repository. It is not kept in the browser."
            />
          </fieldset>
          {submitError && (
            <Alert variant="destructive" role="alert">
              {submitError}
            </Alert>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add Repository'}
          </Button>
        </form>
      )}
    </PageLayout>
  )
}
