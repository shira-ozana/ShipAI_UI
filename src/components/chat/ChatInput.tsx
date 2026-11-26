import { ArrowUp, Square } from 'lucide-react'
import { type KeyboardEvent, type RefObject, useEffect, useLayoutEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_HEIGHT_PX = 220

function fitToContent(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
}

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  /** Lets the parent focus the textarea (e.g. after a suggestion chip is clicked). */
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  textareaRef,
}: ChatInputProps) {
  const canSend = value.trim().length > 0

  // Auto-grow: fit the textarea to its content, up to MAX_HEIGHT_PX.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (el) fitToContent(el)
  }, [value, textareaRef])

  // Re-fit when the width changes (first layout, window resize), since wrapping changes.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    let lastWidth = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return
      lastWidth = el.clientWidth
      fitToContent(el)
    })
    observer.observe(el)
    fitToContent(el)
    return () => observer.disconnect()
  }, [textareaRef])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (canSend && !isStreaming) onSend()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSend && !isStreaming) onSend()
      }}
      className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)] transition-[border-color,box-shadow] focus-within:border-ring/70 focus-within:ring-[3px] focus-within:ring-ring/25"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <Textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to build..."
        aria-describedby="chat-input-hint"
        className="field-sizing-fixed max-h-[220px] min-h-10 resize-none scrollbar-thin border-0 bg-transparent px-2.5 py-2 text-[15px] leading-6 shadow-none focus-visible:ring-0 md:text-[15px] dark:bg-transparent"
      />
      <span id="chat-input-hint" className="sr-only">
        Press Enter to send, Shift+Enter for a new line.
      </span>
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={onStop}
          aria-label="Stop generating"
          className="shrink-0 rounded-xl"
        >
          <Square className="fill-current" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          aria-label="Send message"
          className="shrink-0 rounded-xl"
        >
          <ArrowUp className="size-5" strokeWidth={2.4} />
        </Button>
      )}
    </form>
  )
}
