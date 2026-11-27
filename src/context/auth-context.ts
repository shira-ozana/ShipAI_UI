import { createContext, useContext } from 'react'
import type { UserProfile } from '@/types/repository'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  /** The user of the backend session. Null unless `status` is `authenticated`. */
  user: UserProfile | null
  /** Set when the session check itself failed (backend unreachable), not when signed out. */
  error: string | null
  /**
   * Asks the backend who is signed in. Resolves with the user, or null when there is no
   * session. Call it after registration or sign-in so the UI only trusts the backend's answer.
   */
  refresh: () => Promise<UserProfile | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
