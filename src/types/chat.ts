export type Role = 'user' | 'assistant'

export type MessageStatus = 'streaming' | 'done' | 'error'

export interface Message {
  id: string
  role: Role
  content: string
  createdAt: number
  /** Name of the agent that produced this message. Shown as a small label when present. */
  agent?: string
  status?: MessageStatus
  /** User-facing explanation shown when `status` is `'error'`. */
  error?: string
  /** Neutral note shown under the message, e.g. after the user pressed Stop. */
  notice?: string
}

/** One piece of a streamed assistant reply. */
export interface StreamChunk {
  /** Text to append to the assistant message. */
  delta: string
  /** Optionally set or change the agent label of the reply. */
  agent?: string
}
