import { Bug, FolderTree, Lightbulb, type LucideIcon, TestTube2 } from 'lucide-react'
import { PRODUCT_NAME } from '@/lib/config'

interface Suggestion {
  icon: LucideIcon
  label: string
  prompt: string
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: Lightbulb,
    label: 'Add a new feature',
    prompt: 'Add a new feature: let users export their reports as PDF.',
  },
  {
    icon: FolderTree,
    label: 'Explain the project structure',
    prompt: 'Explain the project structure.',
  },
  {
    icon: TestTube2,
    label: 'Write tests for a module',
    prompt: 'Write unit tests for the authentication module.',
  },
  {
    icon: Bug,
    label: 'Investigate a bug',
    prompt: 'Users report the checkout page is slow. Help me find the cause.',
  },
]

interface EmptyStateProps {
  onSelectSuggestion: (prompt: string) => void
}

export function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 scrollbar-thin overflow-y-auto">
      <div className="m-auto flex w-full max-w-3xl flex-col items-center px-4 py-10 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          What are we building today?
        </h2>
        <p className="mt-3 max-w-md text-base text-balance text-muted-foreground">
          {PRODUCT_NAME} turns your ideas into plans, code and tests with a team of agents across
          the software lifecycle.
        </p>
        <ul className="mt-10 grid w-full max-w-xl gap-3 sm:grid-cols-2" aria-label="Suggestions">
          {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => onSelectSuggestion(prompt)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-left text-sm font-medium transition-colors outline-none hover:border-primary/40 hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
