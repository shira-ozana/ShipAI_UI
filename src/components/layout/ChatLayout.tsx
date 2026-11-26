import type { ReactNode } from 'react'
import { Header } from './Header'

interface ChatLayoutProps {
  isMock?: boolean
  /** Scrollable main area (messages or empty state). */
  children: ReactNode
  /** Input bar pinned to the bottom. */
  footer: ReactNode
}

export function ChatLayout({ isMock, children, footer }: ChatLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Header isMock={isMock} />
      <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
      <div className="shrink-0 bg-gradient-to-t from-background via-background to-background/0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="mx-auto w-full max-w-3xl">{footer}</div>
      </div>
    </div>
  )
}
