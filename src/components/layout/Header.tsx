import { CodeXml } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { PRODUCT_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Chat' },
  { to: '/repositories/new', label: 'Add repository' },
]

interface HeaderProps {
  /** Shows a small "Mock" badge when replies come from the mock service. */
  isMock?: boolean
}

export function Header({ isMock = false }: HeaderProps) {
  const { status, user, signOut } = useAuth()
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
        <div className="flex items-center gap-3">
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-accent text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {status === 'authenticated' && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.username}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            status !== 'loading' && (
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm">
                  <NavLink to="/sign-in">Sign in</NavLink>
                </Button>
                <Button asChild size="sm">
                  <NavLink to="/register">Register</NavLink>
                </Button>
              </div>
            )
          )}
          {isMock && (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Mock mode
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
