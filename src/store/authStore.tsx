import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthUser } from "../services/authService";

const AUTH_STORAGE_KEY = "@CalGenie_AuthState";

export type DailyCalorieGoal = number | null;

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  dailyCalorieGoal: DailyCalorieGoal;
  isAuthed: boolean;
  isRestoring: boolean;

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
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const { token: t, user: u, dailyCalorieGoal: d } = JSON.parse(stored);
          if (t && u) {
            setToken(t);
            setUser(u);
            if (d !== undefined) {
              setDailyCalorieGoalState(d);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load auth session", e);
      } finally {
        setIsRestoring(false);
      }
    }
    loadSession();
  }, []);

  const saveSession = async (
    t: string | null,
    u: AuthUser | null,
    d: DailyCalorieGoal
  ) => {
    try {
      if (t && u) {
        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ token: t, user: u, dailyCalorieGoal: d })
        );
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to save auth session", e);
    }
  };

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setDailyCalorieGoalState((prev) => {
      saveSession(nextToken, nextUser, prev);
      return prev;
    });
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setDailyCalorieGoalState(null);
    saveSession(null, null, null);
  }, []);

  const setDailyCalorieGoal = useCallback((goal: number) => {
    setDailyCalorieGoalState(goal);
    setToken((prevToken) => {
      setUser((prevUser) => {
        saveSession(prevToken, prevUser, goal);
        return prevUser;
      });
      return prevToken;
    });
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser = {
        ...prev,
        ...updates,
      };
      setToken((prevToken) => {
        setDailyCalorieGoalState((prevGoal) => {
          saveSession(prevToken, nextUser, prevGoal);
          return prevGoal;
        });
        return prevToken;
      });
      return nextUser;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      dailyCalorieGoal,
      isAuthed: token != null && user != null,
      isRestoring,
      setSession,
      clearSession,
      setDailyCalorieGoal,
      updateUser,
    }),
    [
      token,
      user,
      dailyCalorieGoal,
      isRestoring,
      setSession,
      clearSession,
      setDailyCalorieGoal,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
