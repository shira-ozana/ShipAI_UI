import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, isAbortError } from '@/lib/http'
import { getCurrentUser, signOutRequest } from '@/services/authService'
import type { UserProfile } from '@/types/repository'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

function describe(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Could not check the session.'
}

/**
 * Holds the current user, always read from the backend session (`GET /api/auth/me`).
 * Nothing about the user is kept in localStorage or inferred from a registration response.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const current = await getCurrentUser(signal)
      setUser(current)
      setError(null)
      setStatus(current ? 'authenticated' : 'unauthenticated')
      return current
    } catch (caught) {
      if (isAbortError(caught)) return null
      setUser(null)
      setError(describe(caught))
      setStatus('error')
      return null
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session check on mount
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const signOut = useCallback(async () => {
    try {
      await signOutRequest()
    } finally {
      // Re-ask the backend rather than assuming: if sign-out failed we stay signed in.
      await refresh()
    }
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, refresh: () => refresh(), signOut }),
    [status, user, error, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
