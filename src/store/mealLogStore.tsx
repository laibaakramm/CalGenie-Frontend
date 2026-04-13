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
  createFoodLog,
  deleteFoodLog,
  getFoodLogs,
  type FoodLogFilter,
  updateFoodLog,
} from "../services/foodLogService";
import { useAuth } from "./authStore";
import { isAuthenticatedApiToken } from "./dashboardOverviewStore";

export type MealType = "breakfast" | "lunch" | "dinner";

export interface MealLogItem {
  id: string;
  mealType: MealType;
  foodName: string;
  calories: number;
  createdAt: number;
}

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

interface MealLogContextValue {
  logs: MealLogItem[];
  addMealLog: (
    mealType: MealType,
    foodName: string,
    calories: number,
  ) => Promise<MealLogItem>;
  updateMealLog: (
    id: string,
    updates: Partial<Pick<MealLogItem, "mealType" | "foodName" | "calories">>,
  ) => Promise<void>;
  removeMealLog: (id: string) => Promise<void>;
  refreshLogs: (filter?: FoodLogFilter) => Promise<void>;
  activeFilter: FoodLogFilter;
  setActiveFilter: (filter: FoodLogFilter) => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  clearError: () => void;
  /** Calories from all meals logged on the current local calendar day. */
  todayTotalCalories: number;
  logsByMeal: Record<MealType, MealLogItem[]>;
}

const MealLogContext = createContext<MealLogContextValue | null>(null);

export function MealLogProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [logs, setLogs] = useState<MealLogItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FoodLogFilter>("daily");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLogs([]);
    setError(null);
  }, [user?.id, token]);

  const refreshLogs = useCallback(
    async (filter?: FoodLogFilter) => {
      const effectiveFilter = filter ?? activeFilter;
      if (filter) setActiveFilter(filter);
      if (!isAuthenticatedApiToken(token)) return;
      setLoading(true);
      setError(null);
      try {
        const serverLogs = await getFoodLogs(token!, effectiveFilter);
        setLogs(serverLogs);
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unable to load food logs.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, token],
  );

  const addMealLog = useCallback(
    async (mealType: MealType, foodName: string, calories: number) => {
      setSaving(true);
      setError(null);
      try {
        const normalized: MealLogItem = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          mealType,
          foodName,
          calories,
          createdAt: Date.now(),
        };
        if (!isAuthenticatedApiToken(token)) {
          setLogs((prev) => [normalized, ...prev]);
          return normalized;
        }
        const created = await createFoodLog(token!, { mealType, foodName, calories });
        setLogs((prev) => [created, ...prev]);
        return created;
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unable to save food log.";
        setError(message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const updateMealLog = useCallback(
    async (
      id: string,
      updates: Partial<Pick<MealLogItem, "mealType" | "foodName" | "calories">>,
    ) => {
      setSaving(true);
      setError(null);
      try {
        if (!isAuthenticatedApiToken(token)) {
          setLogs((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
          );
          return;
        }
        const updated = await updateFoodLog(token!, id, updates);
        setLogs((prev) => prev.map((item) => (item.id === id ? updated : item)));
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unable to update food log.";
        setError(message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const removeMealLog = useCallback(
    async (id: string) => {
      setSaving(true);
      setError(null);
      try {
        if (isAuthenticatedApiToken(token)) {
          await deleteFoodLog(token!, id);
        }
        setLogs((prev) => prev.filter((item) => item.id !== id));
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unable to delete food log.";
        setError(message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const todayTotalCalories = useMemo(() => {
    const n = Date.now();
    return logs
      .filter((l) => isSameLocalDay(l.createdAt, n))
      .reduce((s, l) => s + l.calories, 0);
  }, [logs]);

  const logsByMeal = useMemo(() => {
    const grouped: Record<MealType, MealLogItem[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };
    const sorted = [...logs].sort((a, b) => b.createdAt - a.createdAt);
    for (const item of sorted) {
      grouped[item.mealType].push(item);
    }
    return grouped;
  }, [logs]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!isAuthenticatedApiToken(token)) return;
    void refreshLogs(activeFilter);
  }, [activeFilter, refreshLogs, token]);

  const value = useMemo<MealLogContextValue>(
    () => ({
      logs,
      addMealLog,
      updateMealLog,
      removeMealLog,
      refreshLogs,
      activeFilter,
      setActiveFilter,
      loading,
      saving,
      error,
      clearError,
      todayTotalCalories,
      logsByMeal,
    }),
    [
      logs,
      addMealLog,
      updateMealLog,
      removeMealLog,
      refreshLogs,
      activeFilter,
      setActiveFilter,
      loading,
      saving,
      error,
      clearError,
      todayTotalCalories,
      logsByMeal,
    ],
  );

  return (
    <MealLogContext.Provider value={value}>{children}</MealLogContext.Provider>
  );
}

export function useMealLogs() {
  const ctx = useContext(MealLogContext);
  if (!ctx) throw new Error("useMealLogs must be used within MealLogProvider");
  return ctx;
}
