import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border p-4 sm:p-4.5 shadow-xs [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4.5 font-sans bg-white text-slate-900",
  {
    variants: {
      variant: {
        default:
          "border-slate-200/90 bg-white text-slate-900 [&>svg]:text-blue-600",
        dark:
          "border-slate-200/90 bg-white text-slate-900 [&>svg]:text-slate-700",
        destructive:
          "border-rose-200/90 bg-white text-slate-900 [&>svg]:text-rose-600 [&_.alert-desc]:text-slate-600",
        success:
          "border-emerald-200/90 bg-white text-slate-900 [&>svg]:text-emerald-600 [&_.alert-desc]:text-slate-600",
        warning:
          "border-amber-200/90 bg-white text-slate-900 [&>svg]:text-amber-600 [&_.alert-desc]:text-slate-600",
        info:
          "border-blue-200/90 bg-white text-slate-900 [&>svg]:text-blue-600 [&_.alert-desc]:text-slate-600",
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
    className={cn("mb-1 font-semibold leading-none tracking-tight text-sm font-sans", className)}
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
    className={cn("text-[13px] leading-relaxed text-slate-600 alert-desc mt-0.5 font-sans", className)}
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
