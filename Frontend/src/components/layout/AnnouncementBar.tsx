import { Truck } from "lucide-react"
import { siteConfig } from "@/config/site"

export default function AnnouncementBar() {
  return (
    <div className="bg-brand-black text-white text-xs font-medium py-2 px-4 border-b border-brand-black/20">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <Truck className="h-3.5 w-3.5 text-brand-gold shrink-0 animate-pulse" />
        <span className="tracking-wide">
          {siteConfig.announcement}
        </span>
        <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-brand-gold/80 ml-1" />
      </div>
    </div>
  )
}
