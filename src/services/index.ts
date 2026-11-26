/**
 * The single place that chooses which ChatService the app uses.
 *
 * The real backend (`apiChatService`) is the default. The mock is only used when
 * `VITE_USE_MOCK=true` is set explicitly; it is never a fallback after an API error.
 */
import { USE_MOCK } from '@/lib/config'
import { apiChatService } from './apiChatService'
import type { ChatService } from './chatService'
import { mockChatService } from './mockChatService'

export const chatService: ChatService = USE_MOCK ? mockChatService : apiChatService

/** True while the UI is backed by the mock service. Shown as a badge in the header. */
export const isMockService: boolean = chatService === mockChatService

export { ChatServiceError } from './chatService'
export type { ChatService } from './chatService'
