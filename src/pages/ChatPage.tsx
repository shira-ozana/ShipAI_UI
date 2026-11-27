import { useRef } from 'react'
import { ChatInput } from '@/components/chat/ChatInput'
import { EmptyState } from '@/components/chat/EmptyState'
import { MessageList } from '@/components/chat/MessageList'
import { ChatLayout } from '@/components/layout/ChatLayout'
import { useChat } from '@/hooks/useChat'
import { isMockService } from '@/services'

export default function ChatPage() {
  const { messages, draft, setDraft, isStreaming, send, stop } = useChat()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function handleSuggestion(prompt: string) {
    setDraft(prompt)
    const el = inputRef.current
    if (el) {
      el.focus()
      // Put the caret at the end so the user can keep typing.
      requestAnimationFrame(() => el.setSelectionRange(prompt.length, prompt.length))
    }
  }

  return (
    <ChatLayout
      isMock={isMockService}
      footer={
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={() => send()}
          onStop={stop}
          isStreaming={isStreaming}
          textareaRef={inputRef}
        />
      }
    >
      {messages.length === 0 ? (
        <EmptyState onSelectSuggestion={handleSuggestion} />
      ) : (
        <MessageList messages={messages} />
      )}
    </ChatLayout>
  )
}
