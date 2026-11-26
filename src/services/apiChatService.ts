import { API_URL } from '@/lib/config'
import { type ChatService, ChatServiceError, isAbortError } from './chatService'

const CHAT_URL = `${API_URL}/api/chat`

const OFFLINE_MESSAGE =
  "Can't reach the chat backend. Make sure the API server is running, then try again."
const INVALID_MESSAGE = 'The backend sent a reply the app could not understand. Please try again.'
const BUSY_MESSAGE =
  'The previous request in this conversation is still running on the server. ' +
  'If you pressed Stop, the server may still be finishing that turn. ' +
  'Wait a moment, then send your message again.'

interface ChatReply {
  threadId: string
  reply: string
}

function isChatReply(value: unknown, threadId: string): value is ChatReply {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return (
    body.threadId === threadId && typeof body.reply === 'string' && body.reply.trim().length > 0
  )
}

/**
 * Talks to the Generic Agent API: `POST /api/chat` with the thread id and only the newest
 * user message. The backend keeps the history per thread and answers with one complete
 * JSON reply, which is handed to `onChunk` once.
 *
 * Aborting (Stop) cancels the browser request only. The server may still finish the turn.
 */
export const apiChatService: ChatService = {
  async sendMessage(threadId, messages, onChunk, signal) {
    const message = messages.findLast((m) => m.role === 'user')?.content
    if (!message) throw new ChatServiceError('There is no message to send.')

    let response: Response
    try {
      response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ threadId, message }),
        signal,
      })
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new ChatServiceError(OFFLINE_MESSAGE, { cause: error })
    }

    if (response.status === 409) throw new ChatServiceError(BUSY_MESSAGE)
    if (!response.ok) {
      const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
      // The Vite proxy answers 502 with a plain-text body when nothing listens upstream.
      // The API itself always sends JSON errors (e.g. 502 when the Cursor run failed).
      if ([502, 503, 504].includes(response.status) && !isJson) {
        throw new ChatServiceError(OFFLINE_MESSAGE)
      }
      if (response.status === 502) {
        throw new ChatServiceError(
          'The agent could not produce a reply (the model run failed). Please try again.',
        )
      }
      throw new ChatServiceError(
        `The backend returned an error (HTTP ${response.status}). Please try again.`,
      )
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new ChatServiceError(INVALID_MESSAGE, { cause: error })
    }

    if (!isChatReply(body, threadId)) throw new ChatServiceError(INVALID_MESSAGE)
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    onChunk({ delta: body.reply })
  },
}
