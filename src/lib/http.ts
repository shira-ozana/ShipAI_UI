/**
 * Small JSON client shared by the platform and INIT services. `apiChatService` keeps its own
 * fetch code and is not affected.
 *
 * Request bodies are never logged or copied into errors, because they can carry a GitHub
 * personal access token.
 */

export const OFFLINE_MESSAGE =
  "Can't reach the backend. Make sure the API server is running, then try again."

export class ApiError extends Error {
  /** HTTP status, or null when no response arrived. */
  readonly status: number | null
  /** The backend's `detail`, flattened to one string when it sent one. */
  readonly detail: string | null

  constructor(message: string, status: number | null, detail: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export interface ApiResponse {
  status: number
  body: unknown
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** FastAPI sends `detail` as a string, or as a list of `{ loc, msg }` for 422 errors. */
function extractDetail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const detail = (body as Record<string, unknown>).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return []
      const { loc, msg } = item as { loc?: unknown; msg?: unknown }
      if (typeof msg !== 'string') return []
      const field = Array.isArray(loc) ? loc.filter((p) => p !== 'body').join('.') : ''
      return [field ? `${field}: ${msg}` : msg]
    })
    return parts.length > 0 ? parts.join('; ') : null
  }
  return null
}

async function request(
  method: 'GET' | 'POST',
  url: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const init: RequestInit = { method, headers, signal }
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(payload)
  }

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(OFFLINE_MESSAGE, null)
  }

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  // The Vite proxy answers 502/503/504 with a plain-text body when nothing listens upstream.
  if (!isJson && [502, 503, 504].includes(response.status)) {
    throw new ApiError(OFFLINE_MESSAGE, response.status)
  }

  let body: unknown = null
  if (isJson) {
    try {
      body = await response.json()
    } catch (error) {
      if (isAbortError(error)) throw error
      body = null
    }
  }
  return { status: response.status, body }
}

export function postJson(url: string, payload: unknown, signal?: AbortSignal) {
  return request('POST', url, payload, signal)
}

export function getJson(url: string, signal?: AbortSignal) {
  return request('GET', url, undefined, signal)
}

/** Builds the error for a response whose status the caller did not expect. */
export function unexpectedStatus(response: ApiResponse, fallback: string): ApiError {
  const detail = extractDetail(response.body)
  return new ApiError(fallback, response.status, detail)
}
