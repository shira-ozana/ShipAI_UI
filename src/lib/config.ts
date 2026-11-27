function cleanBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '')
}

/** Product name shown in the UI. Rename the product here. */
export const PRODUCT_NAME = 'Ship AI'

/**
 * Optional base URL of the chat backend, read from `VITE_API_URL` (no trailing slash needed).
 * Leave it empty (the default) to call the relative `/api/...` paths, which the Vite dev
 * server proxies to the local backend. When set, the browser calls that origin directly,
 * so the backend must allow CORS for the UI's origin.
 */
export const API_URL: string = cleanBaseUrl(import.meta.env.VITE_API_URL)

/**
 * Base URL of the platform backend (`/api/users`, `/api/repositories`). Empty (the default)
 * uses the relative `/api/...` paths, which the Vite dev server proxies to `127.0.0.1:8000`.
 * That backend only allows CORS for `http://localhost:4200`, so keep this empty in development.
 */
export const PLATFORM_API_URL: string = cleanBaseUrl(import.meta.env.VITE_PLATFORM_API_URL)

/**
 * Base URL of the Generic Agent API that serves `/api/init`. Falls back to `VITE_API_URL`
 * (the same server as `/api/chat`). Empty uses the relative `/api/init` path, which the Vite
 * dev server proxies to `127.0.0.1:3000`.
 */
export const AGENT_API_URL: string = cleanBaseUrl(import.meta.env.VITE_AGENT_API_URL) || API_URL

/** True only when `VITE_USE_MOCK=true`. The mock is never used as an error fallback. */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === 'true'
