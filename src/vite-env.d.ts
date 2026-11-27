/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_PLATFORM_API_URL?: string
  readonly VITE_AGENT_API_URL?: string
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
