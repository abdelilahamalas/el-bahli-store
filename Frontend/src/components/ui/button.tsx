import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#0B1528] text-white hover:bg-[#1A2844] shadow-xs',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200/60 shadow-2xs',
        gold:
          'bg-[#E5C368] text-[#0B1528] hover:bg-[#D8B452] font-bold shadow-xs',
        outline:
          'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
        ghost:
          'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        link:
          'text-slate-800 underline-offset-4 hover:underline',
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
