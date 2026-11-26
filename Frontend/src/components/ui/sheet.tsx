import * as React from 'react'
import { createPortal } from 'react-dom'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextType | null>(null)

export function useSheet() {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error('useSheet must be used within a Sheet')
  }
  return context
}

interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Sheet({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange: setControlledOpen,
  children,
}: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      setControlledOpen?.(nextOpen)
    },
    [isControlled, setControlledOpen]
  )

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export function SheetTrigger({
  asChild,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useSheet()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      onOpenChange(true)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (children as any).props?.onClick?.(e)
        if (!e.defaultPrevented) {
          onOpenChange(true)
        }
      },
    })
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

export function SheetClose({
  asChild,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useSheet()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      onOpenChange(false)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (children as any).props?.onClick?.(e)
        if (!e.defaultPrevented) {
          onOpenChange(false)
        }
      },
    })
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

export function SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SheetOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = useSheet()
  return (
    <div
      onClick={() => onOpenChange(false)}
      className={cn(
        'fixed inset-0 z-50 bg-black/80 transition-opacity duration-300 animate-in fade-in cursor-pointer',
        className
      )}
      {...props}
    />
  )
}

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out duration-300 animate-in',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b slide-in-from-top',
        bottom: 'inset-x-0 bottom-0 border-t slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r slide-in-from-left sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
)

export interface SheetContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof sheetVariants> {
  onCloseAutoFocus?: (event: Event) => void
  onPointerDownOutside?: (event: any) => void
}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, children, onCloseAutoFocus: _onCloseAutoFocus, onPointerDownOutside: _onPointerDownOutside, ...props }, ref) => {
    const { open, onOpenChange } = useSheet()

    // Gestion propre et sûre du scroll lock et des touches clavier
    React.useEffect(() => {
      if (!open) return

      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.body.style.pointerEvents = ''

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false)
        }
      }

      window.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.overflow = prevOverflow
        document.body.style.pointerEvents = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    }, [open, onOpenChange])

    if (!open) return null

    return createPortal(
      <>
        {/* Overlay d'arrière-plan */}
        <div
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-300 animate-in fade-in cursor-pointer"
          aria-hidden="true"
        />

        {/* Tiroir / Panel */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none hover:bg-secondary p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>
      </>,
      document.body
    )
  }
)
SheetContent.displayName = 'SheetContent'

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = 'SheetHeader'

export const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = 'SheetFooter'

export const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'
