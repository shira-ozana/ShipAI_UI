import { CodeXml } from 'lucide-react'
import { PRODUCT_NAME } from '@/lib/config'

interface HeaderProps {
  /** Shows a small "Mock" badge when replies come from the mock service. */
  isMock?: boolean
}

export function Header({ isMock = false }: HeaderProps) {
  return (
    <header className="shrink-0 border-b border-border/70 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--color-primary)]"
          >
            <CodeXml className="size-4.5" strokeWidth={2.4} />
          </span>
          <h1 className="text-base font-semibold tracking-tight">{PRODUCT_NAME}</h1>
        </div>
        {isMock && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Mock mode
          </span>
        )}
      </div>
    </header>
  )
}
