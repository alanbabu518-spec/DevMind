import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/pages/AuthenticationPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/devmind/login" element={<LoginPage />} />

        <Route path="*" element={<Navigate to="/devmind/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
