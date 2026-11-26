import type { Message, StreamChunk } from '@/types/chat'

/**
 * Contract between the UI and whatever produces assistant replies.
 *
 * `threadId` identifies the conversation. It is generated once per chat session by
 * `useChat` and stays the same across turns, so a backend that keeps the history itself
 * (LangGraph checkpoints) only needs the newest user message. `messages` is the full
 * local history, ending with that newest user message; implementations may ignore the
 * older entries.
 *
 * Implementations deliver the reply by calling `onChunk` (once or many times) and resolve
 * when the reply is complete. They must stop promptly when `signal` is aborted
 * (the Stop button) and reject with an `AbortError` `DOMException` in that case.
 * Any other failure should be thrown as a `ChatServiceError` with a message that is
 * safe and helpful to show to the user.
 */
export interface ChatService {
  sendMessage(
    threadId: string,
    messages: Message[],
    onChunk: (chunk: StreamChunk) => void,
    signal: AbortSignal,
  ): Promise<void>
}

/** A failure whose `message` is meant to be shown to the user. */
export class ChatServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ChatServiceError'
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
