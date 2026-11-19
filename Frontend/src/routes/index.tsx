import { Routes, Route, Navigate } from "react-router-dom"
import DevCheckPage from "@/pages/DevCheckPage"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DevCheckPage />} />
      <Route path="/dev-check" element={<DevCheckPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
