import type { ReactNode } from 'react'
import { Header } from './Header'

interface PageLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

/** Shell for the onboarding screens: header plus one centered card. */
export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Header />
      <main className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
