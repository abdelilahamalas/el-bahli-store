import { Toaster as Sonner } from "sonner"
import { CheckCircle2, CircleAlert, TriangleAlert, Info, X } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      duration={4000}
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
        classNames: {
          toast:
            "group toast font-sans !bg-white/90 backdrop-blur-2xl !text-slate-900 border !border-slate-200/80 !rounded-[20px] !shadow-xl !p-4 sm:!p-5 !pr-14 flex items-start gap-3 w-full max-w-[420px] relative",
          title: "!text-slate-900 !font-bold !text-sm !tracking-tight !leading-snug",
          description: "!text-slate-600 !text-xs !leading-relaxed !mt-1 !font-normal",
          actionButton:
            "!bg-slate-900 !text-white !text-xs !font-semibold !rounded-lg !px-3 !py-1.5",
          cancelButton:
            "!bg-slate-100 !text-slate-700 !text-xs !rounded-lg !px-3 !py-1.5",
          closeButton:
            "!absolute !top-3.5 !right-3.5 !left-auto !transform-none !bg-black/5 !text-slate-500 hover:!text-slate-900 hover:!bg-black/10 !border !border-black/5 !rounded-lg !w-6 !h-6 !flex !items-center !justify-center !cursor-pointer !transition-colors !opacity-90 hover:!opacity-100",
          success: "!border-emerald-500/40",
          error: "!border-rose-500/45",
          warning: "!border-amber-500/40",
          info: "!border-blue-500/40",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
