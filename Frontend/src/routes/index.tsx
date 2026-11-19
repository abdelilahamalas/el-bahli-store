import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import CatalogPage from "@/pages/CatalogPage"
import CategoryProductsPage from "@/pages/CategoryProductsPage"
import ProductDetailPage from "@/pages/ProductDetailPage"
import DevCheckPage from "@/pages/DevCheckPage"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<CatalogPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="/categories/:slug" element={<CategoryProductsPage />} />
      <Route path="/dev-check" element={<DevCheckPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
