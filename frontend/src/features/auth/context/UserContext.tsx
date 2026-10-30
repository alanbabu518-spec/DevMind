import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  fetchCurrentUser,
  logoutRequest,
  saveProfile,
  type CurrentUser,
} from "../services/userApi";

type Status = "loading" | "authed" | "anonymous" | "error";

type UserContextValue = {
  user: CurrentUser | null;
  status: Status;
  refresh: () => Promise<void>;
  updateProfile: (input: {
    username?: string;
    avatar?: string;
    name?: string;
  }) => Promise<CurrentUser>;
  signOut: () => Promise<void>;
  clear: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser());
      setStatus("authed");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setStatus("anonymous");
      } else {
        setStatus((prev) => (prev === "authed" ? prev : "error"));
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateProfile = useCallback<UserContextValue["updateProfile"]>(
    async (input) => {
      const next = await saveProfile(input);
      setUser(next);
      return next;
    },
    [],
  );

  const clear = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
  }, []);

  const signOut = useCallback(async () => {
    await logoutRequest();
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({ user, status, refresh, updateProfile, signOut, clear }),
    [user, status, refresh, updateProfile, signOut, clear],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
