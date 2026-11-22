import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[20px] border p-4 sm:p-5 shadow-xl [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 font-sans bg-white/90 backdrop-blur-2xl text-slate-900",
  {
    variants: {
      variant: {
        default:
          "border-slate-200/80 [&>svg]:text-slate-900",
        dark:
          "border-slate-200/80 [&>svg]:text-slate-900",
        destructive:
          "border-rose-500/40 bg-rose-50/75 [&>svg]:text-rose-600 [&_.alert-desc]:text-slate-600",
        success:
          "border-emerald-500/35 bg-emerald-50/75 [&>svg]:text-emerald-600 [&_.alert-desc]:text-slate-600",
        warning:
          "border-amber-500/35 bg-amber-50/75 [&>svg]:text-amber-600 [&_.alert-desc]:text-slate-600",
        info:
          "border-blue-500/35 bg-blue-50/75 [&>svg]:text-blue-600 [&_.alert-desc]:text-slate-600",
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
