import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, type CurrentUser } from "../services/authApi";

interface SessionGateProps {
  children: ReactNode;
  allowIncompleteOnboarding?: boolean;
}

export default function SessionGate({
  children,
  allowIncompleteOnboarding = false,
}: SessionGateProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!checked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050605] text-sm text-white/60">
        Checking your session…
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.onboardingCompleted && !allowIncompleteOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.onboardingCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}