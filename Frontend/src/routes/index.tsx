import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import CatalogPage from "@/pages/CatalogPage"
import CategoryProductsPage from "@/pages/CategoryProductsPage"
import ProductDetailPage from "@/pages/ProductDetailPage"
import CartPage from "@/pages/CartPage"
import CheckoutPage from "@/pages/CheckoutPage"
import OrderSuccessPage from "@/pages/OrderSuccessPage"
import DevCheckPage from "@/pages/DevCheckPage"

// Admin Components & Pages
import ProtectedRoute from "@/components/admin/ProtectedRoute"
import AdminLayout from "@/components/admin/AdminLayout"
import AdminLoginPage from "@/pages/admin/AdminLoginPage"
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage"
import AdminProductsPage from "@/pages/admin/AdminProductsPage"
import AdminProductFormPage from "@/pages/admin/AdminProductFormPage"
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage"
import AdminOrderDetailPage from "@/pages/admin/AdminOrderDetailPage"
import AdminCategoriesPage from "@/pages/admin/AdminCategoriesPage"

export default function AppRoutes() {
  return (
    <Routes>
      {/* Vitrine publique */}
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<CatalogPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="/categories/:slug" element={<CategoryProductsPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />
      {/* Outils de développement uniquement en environnement local */}
      {import.meta.env.DEV && <Route path="/dev-check" element={<DevCheckPage />} />}

      {/* Espace Administrateur — Authentification */}
      <Route path="/zakaria/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<Navigate to="/zakaria/admin/login" replace />} />

      {/* Espace Administrateur — Protégé */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/products/new" element={<AdminProductFormPage />} />
          <Route path="/admin/products/:id/edit" element={<AdminProductFormPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
        </Route>
      </Route>

      {/* Redirection fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
