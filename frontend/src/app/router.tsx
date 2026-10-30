import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import LandingPage from "../features/landing/pages/LandingPage";
import LoginPage from "../features/auth/pages/AuthenticationPage";
import OnboardingPage from "../features/onboarding/pages/OnboardingPage";
import DevMind from "../features/Home/pages/Devmind";
import ProfilePage from "../features/Profile/pages/ProfilePage";
import DocsPage from "@/features/docs/pages/DocsPage";
import PrivacyPolicyPage from "@/features/legal/pages/PrivacyPolicyPage";
import TermsPage from "@/features/legal/pages/TermsPage";
import AboutPage from "../features/about/pages/AboutPage";

import ErrorPage from "../shared/components/ui/error-page";
import { DevMindProvider } from "@/features/Home/devmind/store";
import {
  getCurrentUser,
  type CurrentUser,
} from "@/features/auth/services/authApi";
import { UserProvider } from "@/features/auth/context/UserContext";

function RouteGate({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "onboarding" | "app";
}) {
  const location = useLocation();

  const [state, setState] = useState<{
    loading: boolean;
    user: CurrentUser | null;
  }>({
    loading: true,
    user: null,
  });

  useEffect(() => {
    let active = true;

    setState({ loading: true, user: null });

    getCurrentUser()
      .then((user) => {
        if (active) {
          setState({ loading: false, user });
        }
      })
      .catch(() => {
        if (active) {
          setState({ loading: false, user: null });
        }
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (state.loading) {
    return (
      <main className="route-loading">
        <span className="route-loader" />
        <p>Preparing your workspace…</p>
      </main>
    );
  }

  if (!state.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (mode === "onboarding" && state.user.onboardingCompleted) {
    return <Navigate to="/Home" replace />;
  }

  if (mode === "app" && !state.user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/devmind" element={<Navigate to="/" replace />} />

          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/onboarding"
            element={
              <RouteGate mode="onboarding">
                <OnboardingPage />
              </RouteGate>
            }
          />

          <Route
            path="/Home"
            element={
              <RouteGate mode="app">
                <DevMindProvider>
                  <DevMind />
                </DevMindProvider>
              </RouteGate>
            }
          />

          <Route path="/home" element={<Navigate to="/Home" replace />} />

          <Route
            path="/profile"
            element={
              <RouteGate mode="app">
                <ProfilePage />
              </RouteGate>
            }
          />

          {/* Public documentation and legal pages */}
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route path="*" element={<ErrorPage type="404" />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}
