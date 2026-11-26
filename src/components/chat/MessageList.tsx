import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Message } from '@/types/chat'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: Message[]
}

/** Distance from the bottom (px) within which we still count as "at the bottom". */
const STICK_THRESHOLD_PX = 80

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const [showJump, setShowJump] = useState(false)
  const lastUserId = messages.findLast((m) => m.role === 'user')?.id

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < STICK_THRESHOLD_PX
    stickToBottomRef.current = atBottom
    setShowJump(!atBottom)
  }, [])

  // A new user message always brings the view back to the bottom.
  useEffect(() => {
    if (!lastUserId) return
    stickToBottomRef.current = true
    scrollToBottom('smooth')
  }, [lastUserId, scrollToBottom])

  // While content streams in, follow it only if the user has not scrolled up.
  useLayoutEffect(() => {
    if (stickToBottomRef.current) scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full scrollbar-thin overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>
      {showJump && (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => {
            stickToBottomRef.current = true
            scrollToBottom('smooth')
          }}
          aria-label="Scroll to latest message"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-popover shadow-lg"
        >
          <ArrowDown />
        </Button>
      )}
    </div>
  )
}
