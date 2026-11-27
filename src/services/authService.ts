import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, getJson, postJson, unexpectedStatus } from '@/lib/http'
import type { UserProfile } from '@/types/repository'

/**
 * Session contract of the platform backend (`backend/app/auth.py`):
 *
 *  - The session is an HttpOnly cookie (`shipai_session`). The browser sends it by itself and
 *    JavaScript never sees it, so there is no token to store in the UI.
 *  - `POST /api/users` (`201`) starts a session for the account it just created.
 *  - Existing accounts sign in with proof of ownership: `POST /api/auth/sign-in/request` emails
 *    a one-time code to the address on the account, and `POST /api/auth/sign-in/verify`
 *    exchanges that code for the cookie. A username or a registration `409` never does.
 *  - `GET /api/auth/me` is the only source of truth for "who is signed in": `200` with the
 *    profile, or `401`.
 *
 * The cookie is only sent to same-origin requests, so keep `VITE_PLATFORM_API_URL` empty and
 * let the dev server proxy `/api`.
 */
const AUTH_URL = `${PLATFORM_API_URL}/api/auth`

/** The code was wrong, already used, or expired (HTTP 401). */
export class InvalidCodeError extends Error {
  constructor() {
    super('That code is invalid or has expired. Check it, or request a new one.')
    this.name = 'InvalidCodeError'
  }
}

export interface SignInChallenge {
  /** Opaque token to send back together with the emailed code. */
  challenge: string
  expiresIn: number
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return ['user_id', 'first_name', 'last_name', 'email', 'username', 'created_at'].every(
    (key) => typeof body[key] === 'string',
  )
}

/** `GET /api/auth/me`. Resolves with the signed-in user, or null when there is no session. */
export async function getCurrentUser(signal?: AbortSignal): Promise<UserProfile | null> {
  const response = await getJson(`${AUTH_URL}/me`, signal)
  if (response.status === 401) return null
  if (response.status === 200 && isUserProfile(response.body)) return response.body
  throw unexpectedStatus(response, `Could not check the session (HTTP ${response.status}).`)
}

/**
 * `POST /api/auth/sign-in/request`. The backend answers the same way whether or not the
 * account exists, and emails the code only to the address stored on the account.
 */
export async function requestSignInCode(
  identifier: string,
  signal?: AbortSignal,
): Promise<SignInChallenge> {
  const response = await postJson(`${AUTH_URL}/sign-in/request`, { identifier }, signal)
  if (response.status === 202) {
    const body = (response.body ?? {}) as Record<string, unknown>
    if (typeof body.challenge !== 'string') {
      throw new ApiError('The backend sent a response the app could not understand.', 202)
    }
    return {
      challenge: body.challenge,
      expiresIn: typeof body.expires_in === 'number' ? body.expires_in : 600,
    }
  }
  if (response.status === 429) {
    throw unexpectedStatus(response, 'Too many sign-in requests. Wait a few minutes and retry.')
  }
  if (response.status === 503) {
    throw unexpectedStatus(response, 'Sign-in codes cannot be delivered by the server right now.')
  }
  throw unexpectedStatus(response, `Sign-in could not start (HTTP ${response.status}).`)
}

/** `POST /api/auth/sign-in/verify`. On `200` the backend has set the session cookie. */
export async function verifySignInCode(
  challenge: string,
  code: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const response = await postJson(`${AUTH_URL}/sign-in/verify`, { challenge, code }, signal)
  if (response.status === 200 && isUserProfile(response.body)) return response.body
  if (response.status === 401) throw new InvalidCodeError()
  throw unexpectedStatus(response, `Sign-in failed (HTTP ${response.status}). Please try again.`)
}

/** `POST /api/auth/sign-out`. Clears the session cookie. */
export async function signOutRequest(signal?: AbortSignal): Promise<void> {
  const response = await postJson(`${AUTH_URL}/sign-out`, undefined, signal)
  if (response.status !== 204) {
    throw unexpectedStatus(response, `Sign-out failed (HTTP ${response.status}).`)
  }
}
