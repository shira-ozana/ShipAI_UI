import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id' | 'value'> {
  label: string
  value: string
  /** Validation message shown under the input. */
  error?: string | null
  hint?: string
}

/** Label + input + hint/error, wired together for screen readers. */
export function FormField({ label, error, hint, ...inputProps }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
