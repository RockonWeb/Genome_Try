import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20',
        secondary:
          'border-transparent bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20',
        destructive:
          'border-transparent bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20',
        outline:
          'border-genome-border text-slate-300 hover:border-slate-400 hover:text-white',
        success:
          'border-transparent bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
