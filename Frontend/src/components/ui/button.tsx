import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C9A227] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#18181B] text-white hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] shadow-xs',
        secondary:
          'bg-muted text-foreground hover:bg-muted/80 border border-border/60 shadow-2xs',
        gold:
          'bg-[#C9A227] text-[#111111] hover:bg-[#B89220] border border-[#C9A227] font-bold shadow-xs',
        outline:
          'border border-border/80 bg-white text-foreground hover:bg-muted/60 hover:border-border text-foreground shadow-2xs',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600 shadow-xs',
        ghost:
          'text-foreground hover:bg-muted/60 hover:text-foreground border border-transparent',
        link:
          'text-[#111111] underline-offset-4 hover:underline hover:text-[#C9A227] border border-transparent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8.5 rounded-xl px-3 text-xs',
        lg: 'h-11 rounded-xl px-8 text-base',
        icon: 'h-9 w-9 rounded-xl',
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
