import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A227] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:opacity-95 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#111111] text-white hover:bg-[#252525] border border-[#111111] shadow-2xs',
        secondary:
          'bg-muted text-foreground hover:bg-muted/80 border border-border/40 shadow-2xs',
        gold:
          'bg-[#C9A227] text-[#111111] hover:bg-[#B89220] border border-[#C9A227] font-semibold shadow-2xs',
        outline:
          'border border-border bg-white text-foreground hover:bg-muted hover:text-foreground shadow-2xs',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600 shadow-2xs',
        ghost:
          'text-foreground hover:bg-muted hover:text-foreground border border-transparent',
        link:
          'text-[#111111] underline-offset-4 hover:underline hover:text-[#C9A227] border border-transparent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
