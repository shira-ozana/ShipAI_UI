import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-card text-card-foreground',
      destructive: 'border-destructive/40 bg-destructive/10 text-foreground',
      warning: 'border-amber-400/40 bg-amber-400/10 text-foreground',
      success: 'border-emerald-400/40 bg-emerald-400/10 text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
