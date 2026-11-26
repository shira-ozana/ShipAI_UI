/** Product name shown in the UI. Rename the product here. */
export const PRODUCT_NAME = 'SDLC Studio'

/**
 * Optional base URL of the chat backend, read from `VITE_API_URL` (no trailing slash needed).
 * Leave it empty (the default) to call the relative `/api/...` paths, which the Vite dev
 * server proxies to the local backend. When set, the browser calls that origin directly,
 * so the backend must allow CORS for the UI's origin.
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

/** True only when `VITE_USE_MOCK=true`. The mock is never used as an error fallback. */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === 'true'
