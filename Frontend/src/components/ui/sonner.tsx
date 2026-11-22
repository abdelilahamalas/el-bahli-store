import { Toaster as Sonner } from "sonner"
import { CheckCircle2, CircleAlert, TriangleAlert, Info, X } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      duration={4500}
      closeButton
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
        error: <CircleAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
        warning: <TriangleAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
        info: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
        close: <X className="w-3.5 h-3.5" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast font-sans !bg-[#141416]/80 backdrop-blur-xl !text-white border !border-white/10 !rounded-[20px] !shadow-2xl !p-4 sm:!p-5 !pr-14 flex items-start gap-3 w-full max-w-[420px] relative",
          title: "!text-white !font-semibold !text-sm !tracking-tight !leading-snug",
          description: "!text-[#A1A1AA] !text-xs !leading-relaxed !mt-1 !font-normal",
          actionButton:
            "!bg-white !text-slate-900 !text-xs !font-semibold !rounded-lg !px-3 !py-1.5",
          cancelButton:
            "!bg-zinc-800/80 !text-zinc-300 !text-xs !rounded-lg !px-3 !py-1.5",
          closeButton:
            "!absolute !top-3.5 !right-3.5 !left-auto !transform-none !bg-white/10 !text-zinc-400 hover:!text-white hover:!bg-white/20 !border !border-white/10 !rounded-lg !w-6 !h-6 !flex !items-center !justify-center !cursor-pointer !transition-colors !opacity-90 hover:!opacity-100",
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
