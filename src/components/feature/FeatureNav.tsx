import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export function FeatureNav({
  repositoryId,
  featureId,
}: {
  repositoryId: string
  featureId: string
}) {
  const base = `/repositories/${repositoryId}/features/${featureId}`

  return (
    <nav aria-label="Feature" className="flex flex-wrap gap-1 border-b border-border pb-3">
      <NavLink
        to={base}
        end
        className={({ isActive }) =>
          cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )
        }
      >
        Overview
      </NavLink>
      <NavLink
        to={`${base}/tasks`}
        className={({ isActive }) =>
          cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )
        }
      >
        Tasks
      </NavLink>
    </nav>
  )
}
