import { useCallback, useEffect, useRef, useState } from 'react'
import { chatService } from '@/services'
import { ChatServiceError, isAbortError } from '@/services/chatService'
import type { Message } from '@/types/chat'

function createId(): string {
  return crypto.randomUUID()
}

export interface UseChatResult {
  messages: Message[]
  /** Current text in the input box. */
  draft: string
  setDraft: (value: string) => void
  /** True while an assistant reply is being streamed. */
  isStreaming: boolean
  /** Sends `text` (or the current draft) as a user message. */
  send: (text?: string) => void
  /**
   * Stops waiting for the reply (aborts the browser request). A backend may still finish
   * the turn on its side. Any partial reply stays visible.
   */
  stop: () => void
  /** Starts a fresh conversation: clears the messages and begins a new thread. */
  reset: () => void
}

const STOPPED_NOTICE = 'Stopped waiting for the reply. The server may still finish this turn.'

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  // One thread id per chat session. It stays stable across turns so the backend can supply
  // the history, and is replaced only when a fresh conversation starts (see `reset`).
  const threadIdRef = useRef<string | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Abort any in-flight reply when the component using the hook unmounts.
  useEffect(() => () => controllerRef.current?.abort(), [])

  const updateMessage = useCallback((id: string, update: (m: Message) => Message) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? update(m) : m)))
  }, [])

  const send = useCallback(
    (text?: string) => {
      const content = (text ?? draft).trim()
      if (!content || controllerRef.current) return

      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content,
        createdAt: Date.now(),
        status: 'done',
      }
      const assistantId = createId()
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      }

      const history = [...messagesRef.current, userMessage]
      messagesRef.current = [...history, assistantMessage]
      setMessages(messagesRef.current)
      setDraft('')
      setIsStreaming(true)

      const controller = new AbortController()
      controllerRef.current = controller
      const threadId = (threadIdRef.current ??= createId())

      chatService
        .sendMessage(
          threadId,
          history,
          (chunk) =>
            updateMessage(assistantId, (m) => ({
              ...m,
              content: m.content + chunk.delta,
              agent: chunk.agent ?? m.agent,
            })),
          controller.signal,
        )
        .then(() => updateMessage(assistantId, (m) => ({ ...m, status: 'done' })))
        .catch((error: unknown) => {
          if (isAbortError(error)) {
            // Stopped by the user: keep whatever was received so far.
            updateMessage(assistantId, (m) => ({ ...m, status: 'done', notice: STOPPED_NOTICE }))
            return
          }
          console.error('Chat service failed', error)
          updateMessage(assistantId, (m) => ({
            ...m,
            status: 'error',
            error: error instanceof ChatServiceError ? error.message : undefined,
          }))
        })
        .finally(() => {
          // Ignore requests that were superseded by `reset` in the meantime.
          if (controllerRef.current !== controller) return
          controllerRef.current = null
          setIsStreaming(false)
        })
    },
    [draft, updateMessage],
  )

  const stop = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    threadIdRef.current = null
    messagesRef.current = []
    setMessages([])
    setDraft('')
    setIsStreaming(false)
  }, [])

  return { messages, draft, setDraft, isStreaming, send, stop, reset }
}
