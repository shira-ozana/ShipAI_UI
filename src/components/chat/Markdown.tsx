import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

/** Minimal structural view of a hast node, enough to read a code block's text. */
interface HastLike {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastLike[]
}

function textOf(node: HastLike): string {
  if (node.type === 'text') return node.value ?? ''
  return (node.children ?? []).map(textOf).join('')
}

function languageOf(node: HastLike | undefined): string | undefined {
  const className = node?.properties?.className
  const classes = Array.isArray(className) ? className : []
  const match = classes
    .map(String)
    .find((c) => c.startsWith('language-'))
    ?.slice('language-'.length)
  return match
}

const components: Components = {
  pre({ node }) {
    const codeNode = (node as HastLike | undefined)?.children?.find((c) => c.tagName === 'code')
    const code = codeNode ? textOf(codeNode).replace(/\n$/, '') : ''
    return <CodeBlock code={code} language={languageOf(codeNode)} />
  },
  a({ node: _node, ...props }) {
    return <a {...props} target="_blank" rel="noreferrer noopener" />
  },
  table({ node: _node, ...props }) {
    return (
      <div className="scrollbar-thin overflow-x-auto">
        <table {...props} />
      </div>
    )
  },
}

const remarkPlugins = [remarkGfm]

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="prose max-w-none text-[15px] leading-7 prose-neutral prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-primary prose-blockquote:border-l-primary/60 prose-blockquote:font-normal prose-blockquote:text-muted-foreground prose-code:rounded-md prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-li:my-1 prose-li:marker:text-muted-foreground prose-th:text-left">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
