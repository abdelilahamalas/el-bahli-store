import * as React from "react"
import { cn } from "@/utils/utils"

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, collapsed = false, children, ...props }, ref) => {
    return (
      <aside
        ref={ref}
        data-collapsed={collapsed}
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-16 items-center px-4 border-b", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto px-3 py-4 space-y-1", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 border-t mt-auto", className)}
    {...props}
  />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarItem = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    active?: boolean
    icon?: React.ComponentType<{ className?: string }>
  }
>(({ className, active, icon: Icon, children, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
      active
        ? "bg-brand-black text-white"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      className
    )}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4 shrink-0" />}
    <span className="truncate">{children}</span>
  </a>
))
SidebarItem.displayName = "SidebarItem"

export { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem }
