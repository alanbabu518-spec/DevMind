
import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  getCurrentUser,
  type CurrentUser,
} from "../services/authApi";

export default function LandingSessionRedirect({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        // Keep the public page available if authentication is unreachable.
      })
      .finally(() => {
        if (active) setChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!checked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050605] text-sm text-white/60">
        Loading DevMind…
      </main>
    );
  }

  if (user) {
    return (
      <Navigate
        to={user.onboardingCompleted ? "/Home" : "/onboarding"}
        replace
      />
    );
  }

  return <>{children}</>;
}
