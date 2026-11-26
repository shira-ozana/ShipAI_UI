import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch (error) {
      console.error('Could not copy code', error)
    }
  }

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-border bg-code">
      <div className="flex h-9 items-center justify-between border-b border-border pr-1.5 pl-4">
        <span className="font-mono text-xs text-muted-foreground">{language ?? 'code'}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="text-emerald-400" /> : <Copy />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  )
}
