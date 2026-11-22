import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-150 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
