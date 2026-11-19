import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import DevCheckPage from "@/pages/DevCheckPage"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dev-check" element={<DevCheckPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
