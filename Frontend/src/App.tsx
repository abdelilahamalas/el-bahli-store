import { BrowserRouter } from "react-router-dom"
import AppRoutes from "@/routes"
import { CartProvider } from "@/context/CartContext"
import CartSheet from "@/components/cart/CartSheet"
import { Toaster } from "@/components/ui/sonner"

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppRoutes />
        <CartSheet />
        <Toaster richColors position="top-right" />
      </CartProvider>
    </BrowserRouter>
  )
}
