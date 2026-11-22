import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[20px] border p-4 sm:p-5 shadow-lg [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 font-sans bg-[#18181B] text-white",
  {
    variants: {
      variant: {
        default:
          "border-[#27272A] [&>svg]:text-white",
        dark:
          "border-[#27272A] [&>svg]:text-white",
        destructive:
          "border-rose-500/40 [&>svg]:text-rose-400 [&_.alert-desc]:text-[#A1A1AA]",
        success:
          "border-emerald-500/35 [&>svg]:text-emerald-400 [&_.alert-desc]:text-[#A1A1AA]",
        warning:
          "border-amber-500/35 [&>svg]:text-amber-400 [&_.alert-desc]:text-[#A1A1AA]",
        info:
          "border-blue-500/35 [&>svg]:text-blue-400 [&_.alert-desc]:text-[#A1A1AA]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight text-sm", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed text-[#A1A1AA] alert-desc mt-1", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-2 flex items-center justify-end gap-2", className)}
    {...props}
  />
))
AlertAction.displayName = "AlertAction"

export { Alert, AlertTitle, AlertDescription, AlertAction }
