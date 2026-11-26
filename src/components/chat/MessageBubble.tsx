import { AlertCircle, Sparkles } from 'lucide-react'
import { memo } from 'react'
import type { Message } from '@/types/chat'
import { Markdown } from './Markdown'
import { TypingIndicator } from './TypingIndicator'

interface MessageBubbleProps {
  message: Message
}

function AgentLabel({ agent }: { agent: string }) {
  return (
    <span className="mb-1.5 inline-flex items-center rounded-md bg-primary/12 px-2 py-0.5 text-xs font-medium tracking-wide text-primary">
      {agent}
    </span>
  )
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'

  if (isUser) {
    return (
      <div className="flex flex-col items-end">
        {message.agent && <AgentLabel agent={message.agent} />}
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-border bg-secondary px-4 py-2.5 text-[15px] leading-7 break-words whitespace-pre-wrap text-secondary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 sm:gap-4">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"
      >
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1" aria-busy={isStreaming}>
        {message.agent && <AgentLabel agent={message.agent} />}
        {message.content ? (
          <Markdown content={message.content} />
        ) : (
          isStreaming && <TypingIndicator />
        )}
        {isStreaming && message.content && (
          <div className="mt-1">
            <TypingIndicator />
          </div>
        )}
        {message.status === 'error' && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {message.error ?? 'Something went wrong while generating this reply.'}
          </p>
        )}
        {message.notice && <p className="mt-2 text-sm text-muted-foreground">{message.notice}</p>}
      </div>
    </div>
  )
})
