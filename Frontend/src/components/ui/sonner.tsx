import { Toaster as Sonner } from "sonner"
import { CheckCircle2, CircleAlert, TriangleAlert, Info, X } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      duration={2500}
      closeButton
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
        error: <CircleAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
        warning: <TriangleAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
        info: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
        close: <X className="w-3.5 h-3.5" />,
      }}
      toastOptions={{
        unstyled: false,
        duration: 2500,
        classNames: {
          toast:
            "group toast font-sans !bg-white !text-slate-900 border !border-slate-200/90 !rounded-2xl !shadow-md !p-4 sm:!p-4.5 !pr-12 flex items-start gap-3.5 w-full max-w-[420px] relative",
          title: "!text-slate-900 !font-semibold !text-sm !tracking-tight !leading-snug",
          description: "!text-slate-600 !text-[13px] !leading-relaxed !mt-0.5 !font-normal",
          actionButton:
            "!bg-slate-900 !text-white !text-xs !font-semibold !rounded-lg !px-3 !py-1.5",
          cancelButton:
            "!bg-slate-100 !text-slate-700 !text-xs !rounded-lg !px-3 !py-1.5",
          closeButton:
            "!absolute !top-3.5 !right-3.5 !left-auto !transform-none !bg-slate-100/90 !text-slate-400 hover:!text-slate-800 hover:!bg-slate-200/70 !border !border-slate-200/60 !rounded-full !w-6 !h-6 !flex !items-center !justify-center !cursor-pointer !transition-colors !opacity-90 hover:!opacity-100",
          success: "!border-emerald-300/80 !shadow-xs !bg-white",
          error: "!border-rose-300/80 !shadow-xs !bg-white",
          warning: "!border-amber-300/80 !shadow-xs !bg-white",
          info: "!border-blue-300/80 !shadow-xs !bg-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
