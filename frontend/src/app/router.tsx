import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "../features/landing/pages/LandingPage";
import LoginPage from "../features/auth/pages/AuthenticationPage";
import OnboardingPage from "../features/onboarding/pages/OnboardingPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/devmind" element={<LandingPage />} />

        {/* Authentication */}
        <Route path="/devmind/login" element={<LoginPage />} />

        {/* Post-login onboarding */}
        <Route path="/devmind/onboarding" element={<OnboardingPage />} />

        {/* Dashboard placeholder — implement next */}
        <Route
          path="/devmind/dashboard"
          element={<Navigate to="/devmind/onboarding" replace />}
        />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
