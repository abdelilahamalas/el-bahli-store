import { Outlet } from "react-router-dom"
import { usePageMeta } from "@/hooks/usePageMeta"
import AdminSidebar from "./AdminSidebar"
import AdminHeader from "./AdminHeader"

export default function AdminLayout() {
  usePageMeta({
    title: "Administration — El Bahli Store",
    noindex: true,
  })

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8F9FA] text-[#111111]">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:flex flex-col flex-shrink-0 h-full">
        <AdminSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
