import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError } from "../services/apiClient";
import {
  fetchDashboardOverview,
  type DashboardOverview,
  upsertDailyCalorieGoal,
} from "../services/dashboardService";
import { useAuth } from "./authStore";

/** True when the session token should be sent to authenticated REST routes. */
export function isAuthenticatedApiToken(token: string | null): boolean {
  if (!token?.trim()) return false;
  if (token.startsWith("fallback-token-")) return false;
  return true;
}

interface DashboardOverviewContextValue {
  overview: DashboardOverview | null;
  loading: boolean;
  savingGoal: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  saveGoalToApi: (dailyCalorieGoal: number) => Promise<void>;
}

const DashboardOverviewContext =
  createContext<DashboardOverviewContextValue | null>(null);

export function DashboardOverviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, setDailyCalorieGoal } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticatedApiToken(token)) {
      setOverview(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardOverview(token!);
      setOverview(data);
      if (data.dailyGoal > 0) {
        setDailyCalorieGoal(data.dailyGoal);
      }
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load dashboard";
      setError(message);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [token, setDailyCalorieGoal]);

  const saveGoalToApi = useCallback(
    async (dailyCalorieGoal: number) => {
      if (!isAuthenticatedApiToken(token)) {
        throw new Error(
          "Sign in with a valid account to sync your goal with the server.",
        );
      }
      setSavingGoal(true);
      setError(null);
      try {
        await upsertDailyCalorieGoal(token!, dailyCalorieGoal);
        setDailyCalorieGoal(dailyCalorieGoal);
        const data = await fetchDashboardOverview(token!);
        setOverview(data);
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to save goal";
        setError(message);
        throw e;
      } finally {
        setSavingGoal(false);
      }
    },
    [token, setDailyCalorieGoal],
  );

  useEffect(() => {
    if (!isAuthenticatedApiToken(token)) {
      setOverview(null);
      setError(null);
      return;
    }
    void refreshDashboard();
  }, [token, refreshDashboard]);

  const value = useMemo<DashboardOverviewContextValue>(
    () => ({
      overview,
      loading,
      savingGoal,
      error,
      refreshDashboard,
      saveGoalToApi,
    }),
    [overview, loading, savingGoal, error, refreshDashboard, saveGoalToApi],
  );

  return (
    <DashboardOverviewContext.Provider value={value}>
      {children}
    </DashboardOverviewContext.Provider>
  );
}

export function useDashboardOverview() {
  const ctx = useContext(DashboardOverviewContext);
  if (!ctx) {
    throw new Error(
      "useDashboardOverview must be used within DashboardOverviewProvider",
    );
  }
  return ctx;
}

export type { DashboardOverview };
