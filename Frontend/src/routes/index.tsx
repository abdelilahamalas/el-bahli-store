import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import CatalogPage from "@/pages/CatalogPage"
import CategoryProductsPage from "@/pages/CategoryProductsPage"
import ProductDetailPage from "@/pages/ProductDetailPage"
import CartPage from "@/pages/CartPage"
import CheckoutPage from "@/pages/CheckoutPage"
import OrderSuccessPage from "@/pages/OrderSuccessPage"
import NotFoundPage from "@/pages/NotFoundPage"

// Admin Components & Pages
import ProtectedRoute from "@/components/admin/ProtectedRoute"
import AdminLayout from "@/components/admin/AdminLayout"

// Code Splitting — Chargement à la demande des pages administratives et outils
const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"))
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"))
const AdminProductsPage = lazy(() => import("@/pages/admin/AdminProductsPage"))
const AdminProductFormPage = lazy(() => import("@/pages/admin/AdminProductFormPage"))
const AdminOrdersPage = lazy(() => import("@/pages/admin/AdminOrdersPage"))
const AdminOrderDetailPage = lazy(() => import("@/pages/admin/AdminOrderDetailPage"))
const AdminCategoriesPage = lazy(() => import("@/pages/admin/AdminCategoriesPage"))
const DevCheckPage = lazy(() => import("@/pages/DevCheckPage"))

function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center font-sans">
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-[#C9A227] animate-spin mb-3" />
      <p className="text-xs font-semibold text-slate-500 tracking-wide">
        Chargement...
      </p>
    </div>
  )
}

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
      {import.meta.env.DEV && (
        <Route
          path="/dev-check"
          element={
            <Suspense fallback={<PageLoadingFallback />}>
              <DevCheckPage />
            </Suspense>
          }
        />
      )}

      {/* Espace Administrateur — Authentification */}
      <Route
        path="/zakaria/admin/login"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminLoginPage />
          </Suspense>
        }
      />

      {/* Espace Administrateur — Protégé sous /zakaria/admin */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route
            path="/zakaria/admin"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/zakaria/admin/products"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminProductsPage />
              </Suspense>
            }
          />
          <Route
            path="/zakaria/admin/products/new"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminProductFormPage />
              </Suspense>
            }
          />
          <Route
            path="/zakaria/admin/products/:id/edit"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminProductFormPage />
              </Suspense>
            }
          />
          <Route
            path="/zakaria/admin/categories"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminCategoriesPage />
              </Suspense>
            }
          />
          <Route
            path="/zakaria/admin/orders"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminOrdersPage />
              </Suspense>
            }
          />
          <Route
            path="/zakaria/admin/orders/:id"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminOrderDetailPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      {/* Page 404 pour toute route inexistante (y compris /admin sans redirection) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
