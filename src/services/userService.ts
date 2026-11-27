import { PLATFORM_API_URL } from '@/lib/config'
import { ApiError, postJson, unexpectedStatus } from '@/lib/http'
import type { RegisterInput, UserProfile } from '@/types/repository'

const USERS_URL = `${PLATFORM_API_URL}/api/users`

/** Registration was rejected because the email or the username already exists (HTTP 409). */
export class UserConflictError extends Error {
  constructor() {
    super('That email or ShipAI username is already in use. Change it and try again.')
    this.name = 'UserConflictError'
  }
}

const STRING_FIELDS = [
  'user_id',
  'first_name',
  'last_name',
  'email',
  'username',
  'created_at',
] as const

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return STRING_FIELDS.every((key) => typeof body[key] === 'string')
}

/**
 * `POST /api/users`. Resolves with the created profile on `201`.
 * Throws `UserConflictError` on `409` and `ApiError` for everything else.
 */
export async function registerUser(input: RegisterInput, signal?: AbortSignal) {
  const response = await postJson(
    USERS_URL,
    {
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      username: input.username,
    },
    signal,
  )

  if (response.status === 201) {
    if (!isUserProfile(response.body)) {
      throw new ApiError('The backend sent a response the app could not understand.', 201)
    }
    return response.body
  }
  if (response.status === 409) throw new UserConflictError()
  if (response.status === 422) {
    throw unexpectedStatus(response, 'The backend rejected some of the details. Check them.')
  }
  throw unexpectedStatus(
    response,
    `Registration failed (HTTP ${response.status}). Please try again.`,
  )
}
