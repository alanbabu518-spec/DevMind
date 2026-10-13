import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "../features/landing/pages/LandingPage";
import LoginPage from "../features/auth/pages/AuthenticationPage";
import OnboardingPage from "../features/onboarding/pages/OnboardingPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import ProjectsPage from "../features/projects/pages/ProjectsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/devmind" element={<LandingPage />} />
        <Route path="/devmind/login" element={<LoginPage />} />
        <Route path="/devmind/onboarding" element={<OnboardingPage />} />
        <Route path="/devmind/dashboard" element={<DashboardPage />} />
        <Route path="/devmind/projects" element={<ProjectsPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
