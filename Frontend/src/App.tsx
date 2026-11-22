import { BrowserRouter } from "react-router-dom"
import AppRoutes from "@/routes"
import { AuthProvider } from "@/context/AuthContext"
import { CartProvider } from "@/context/CartContext"
import CartSheet from "@/components/cart/CartSheet"
import { Toaster } from "@/components/ui/sonner"
import ScrollToTop from "@/components/common/ScrollToTop"

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <CartSheet />
          <Toaster position="top-right" />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
