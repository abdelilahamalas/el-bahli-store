import { Toaster as Sonner } from "sonner"
import { CheckCircle2, CircleAlert, TriangleAlert, Info } from "lucide-react"

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
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast font-sans !bg-[#18181B] !text-white border !border-[#27272A] !rounded-[20px] !shadow-2xl !p-4 sm:!p-5 flex items-start gap-3 w-full max-w-[420px]",
          title: "!text-white !font-semibold !text-sm !tracking-tight !leading-snug",
          description: "!text-[#A1A1AA] !text-xs !leading-relaxed !mt-1 !font-normal",
          actionButton:
            "!bg-white !text-slate-900 !text-xs !font-semibold !rounded-lg !px-3 !py-1.5",
          cancelButton:
            "!bg-zinc-800 !text-zinc-300 !text-xs !rounded-lg !px-3 !py-1.5",
          closeButton:
            "!bg-[#27272A] !text-[#A1A1AA] hover:!text-white hover:!bg-[#3F3F46] !border !border-[#3F3F46] !rounded-full",
          success: "!border-emerald-500/35",
          error: "!border-rose-500/40",
          warning: "!border-amber-500/35",
          info: "!border-blue-500/35",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
