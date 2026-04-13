import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { AuthUser } from "../services/authService";

export type DailyCalorieGoal = number | null;

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  dailyCalorieGoal: DailyCalorieGoal;
  isAuthed: boolean;

  setSession: (nextToken: string, nextUser: AuthUser) => void;
  clearSession: () => void;
  setDailyCalorieGoal: (goal: number) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dailyCalorieGoal, setDailyCalorieGoalState] =
    useState<DailyCalorieGoal>(null);

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setDailyCalorieGoalState(null);
  }, []);

  const setDailyCalorieGoal = useCallback((goal: number) => {
    setDailyCalorieGoalState(goal);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
      };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      dailyCalorieGoal,
      isAuthed: token != null && user != null,
      setSession,
      clearSession,
      setDailyCalorieGoal,
      updateUser,
    }),
<<<<<<< HEAD
    [token, user, dailyCalorieGoal, setSession, clearSession, setDailyCalorieGoal, updateUser],
=======
    [
      token,
      user,
      dailyCalorieGoal,
      setSession,
      clearSession,
      setDailyCalorieGoal,
    ],
>>>>>>> 0b918c53fb16f4bf2777ca949e744a801a66eefd
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
