import { Loader2 } from "lucide-react"
import { cn } from "@/utils/utils"

interface LoadingSpinnerProps {
  size?: number
  className?: string
}

export default function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2
        style={{ width: size, height: size }}
        className={cn("animate-spin text-brand-gold", className)}
      />
    </div>
  )
}
