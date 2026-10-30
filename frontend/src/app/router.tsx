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

function NotFoundPage() {
  return (
    <main className="route-not-found">
      <span>404</span>
      <h1>This page wandered off.</h1>
      <p>The route doesn't exist or may have moved.</p>
      <a href="/Home">Return to DevMind</a>
    </main>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* Landing page */}
          <Route path="/" element={<LandingPage />} />

          <Route path="/devmind" element={<Navigate to="/" replace />} />

          {/* Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={
              <RouteGate mode="onboarding">
                <OnboardingPage />
              </RouteGate>
            }
          />

          {/* Main DevMind application */}
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

          {/* Normalize lowercase URL */}
          <Route path="/home" element={<Navigate to="/Home" replace />} />

          {/* User profile */}
          <Route
            path="/profile"
            element={
              <RouteGate mode="app">
                <ProfilePage />
              </RouteGate>
            }
          />

          {/* Unknown routes */}
          <Route path="*" element={<NotFoundPage />} />

          <Route path="/Home" element={<DevMind />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}
