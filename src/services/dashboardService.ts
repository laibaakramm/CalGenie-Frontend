import { ApiError, apiRequestAuthFirstPath } from "./apiClient";

export interface DashboardFoodCount {
  foodName: string;
  count: number;
}

export type DashboardRecentLog = Record<string, unknown>;

export interface DashboardOverview {
  totalConsumed: number;
  dailyGoal: number;
  remaining: number;
  progressPercentage: number;
  alertMessage: string | null;
  top10Foods: DashboardFoodCount[];
  recentLogs: DashboardRecentLog[];
}

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  return null;
}

export function normalizeDashboardOverview(raw: unknown): DashboardOverview {
  const data = (raw ?? {}) as Record<string, unknown>;
  const nested =
    (data.data as Record<string, unknown> | undefined) ??
    (data.result as Record<string, unknown> | undefined);
  const root = nested ?? data;

  const topRaw = root.top10Foods ?? root.top_foods ?? root.topFoods;
  const top10Foods: DashboardFoodCount[] = Array.isArray(topRaw)
    ? topRaw
        .map((row) => {
          const r = row as Record<string, unknown>;
          const foodName =
            (typeof r.foodName === "string" && r.foodName) ||
            (typeof r.food_name === "string" && r.food_name) ||
            (typeof r.name === "string" && r.name) ||
            "Food";
          const count = readNumber(r.count ?? r.times ?? r.quantity, 0);
          return { foodName, count: Math.max(0, Math.round(count)) };
        })
        .filter((x) => x.foodName.length > 0)
    : [];

  const recentRaw = root.recentLogs ?? root.recent_logs ?? root.logs;
  const recentLogs: DashboardRecentLog[] = Array.isArray(recentRaw)
    ? (recentRaw as DashboardRecentLog[])
    : [];

  const dailyGoal = readNumber(
    root.dailyGoal ?? root.daily_calorie_goal ?? root.dailyCalorieGoal,
    0,
  );
  const totalConsumed = readNumber(
    root.totalConsumed ?? root.total_consumed ?? root.consumed,
    0,
  );
  const remaining = readNumber(root.remaining ?? root.remainingCalories, 0);
  const progressRaw = readNumber(
    root.progressPercentage ?? root.progress_percentage ?? root.progress,
    0,
  );
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round(progressRaw)),
  );

  return {
    totalConsumed: Math.max(0, totalConsumed),
    dailyGoal: Math.max(0, dailyGoal),
    remaining: Math.max(0, remaining),
    progressPercentage,
    alertMessage: readOptionalString(root.alertMessage ?? root.alert_message),
    top10Foods,
    recentLogs,
  };
}

const DASHBOARD_PATHS: string[] = [
  "/dashboard",
  "/user/dashboard",
  "/me/dashboard",
  "/summary",
];

export async function fetchDashboardOverview(
  token: string,
): Promise<DashboardOverview> {
  const raw = await apiRequestAuthFirstPath<unknown>(
    DASHBOARD_PATHS,
    { method: "GET" },
    token,
  );
  return normalizeDashboardOverview(raw);
}

const GOAL_WRITE_PATHS: string[] = [
  "/goals",
  "/user/goals",
  "/goal",
  "/user/goal",
  "/profile/goals",
];

export async function postDailyCalorieGoal(
  token: string,
  dailyCalorieGoal: number,
): Promise<unknown> {
  return apiRequestAuthFirstPath<unknown>(
    GOAL_WRITE_PATHS,
    { method: "POST", body: { dailyCalorieGoal } },
    token,
  );
}

export async function putDailyCalorieGoal(
  token: string,
  dailyCalorieGoal: number,
): Promise<unknown> {
  return apiRequestAuthFirstPath<unknown>(
    GOAL_WRITE_PATHS,
    { method: "PUT", body: { dailyCalorieGoal } },
    token,
  );
}

/** Tries POST (with path fallbacks) then PUT the same way. */
export async function upsertDailyCalorieGoal(
  token: string,
  dailyCalorieGoal: number,
): Promise<unknown> {
  try {
    return await postDailyCalorieGoal(token, dailyCalorieGoal);
  } catch (e: unknown) {
    if (
      e instanceof ApiError &&
      (e.status === 404 || e.status === 405)
    ) {
      return putDailyCalorieGoal(token, dailyCalorieGoal);
    }
    throw e;
  }
}
