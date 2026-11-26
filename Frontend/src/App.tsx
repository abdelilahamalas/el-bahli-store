import { BrowserRouter } from "react-router-dom"
import AppRoutes from "@/routes"
import { AuthProvider } from "@/context/AuthContext"
import { CartProvider } from "@/context/CartContext"
import CartSheet from "@/components/cart/CartSheet"
import { Toaster } from "@/components/ui/sonner"
import ScrollToTop from "@/components/common/ScrollToTop"
import ErrorBoundary from "@/components/common/ErrorBoundary"

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
            <CartSheet />
            <Toaster position="top-right" />
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
