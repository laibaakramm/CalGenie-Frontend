import type { MealType } from "../store/mealLogStore";
import { apiRequestAuth, apiRequestAuthFirstPath } from "./apiClient";

export type FoodLogFilter = "daily" | "monthly" | "yearly";

export interface FoodLogPayload {
  foodName: string;
  calories: number;
  mealType?: MealType;
  weight?: number;
  volume?: number;
}

export interface FoodLogRecord {
  id: string;
  foodName: string;
  calories: number;
  mealType: MealType;
  createdAt: number;
  weight?: number;
  volume?: number;
}

const FOOD_LOG_PATHS = ["/food-logs", "/logs", "/food/logs"] as const;

function normalizeMealType(raw: unknown): MealType {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "breakfast" || value === "lunch" || value === "dinner") {
    return value;
  }
  if (value === "brunch") return "lunch";
  return "dinner";
}

function readTimestamp(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const fromDate = Date.parse(raw);
    if (Number.isFinite(fromDate)) return fromDate;
    const asNum = Number(raw);
    if (Number.isFinite(asNum)) return asNum;
  }
  return Date.now();
}

function normalizeLogRecord(raw: unknown): FoodLogRecord {
  const row = (raw ?? {}) as Record<string, unknown>;
  const idRaw = row.id ?? row.logId ?? row._id;
  const id =
    idRaw != null && String(idRaw).trim() !== ""
      ? String(idRaw)
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const caloriesNum = Number(row.calories);
  return {
    id,
    foodName:
      (typeof row.foodName === "string" && row.foodName) ||
      (typeof row.food_name === "string" && row.food_name) ||
      (typeof row.name === "string" && row.name) ||
      (typeof row.food === "string" && row.food) ||
      (typeof row.title === "string" && row.title) ||
      (typeof row.description === "string" && row.description) ||
      (typeof row.item === "string" && row.item) ||
      "Food",
    calories: Number.isFinite(caloriesNum) ? Math.max(0, caloriesNum) : 0,
    mealType: normalizeMealType(row.mealType ?? row.meal_type),
    createdAt: readTimestamp(
      row.createdAt ?? row.created_at ?? row.timestamp ?? row.loggedAt,
    ),
    weight:
      Number.isFinite(Number(row.weight)) && Number(row.weight) > 0
        ? Number(row.weight)
        : undefined,
    volume:
      Number.isFinite(Number(row.volume)) && Number(row.volume) > 0
        ? Number(row.volume)
        : undefined,
  };
}

function toApiMealType(mealType?: MealType): string | undefined {
  if (!mealType) return undefined;
  return mealType.toUpperCase();
}

export async function createFoodLog(
  token: string,
  payload: FoodLogPayload,
): Promise<FoodLogRecord> {
  const raw = await apiRequestAuthFirstPath<unknown>(
    FOOD_LOG_PATHS,
    {
      method: "POST",
      body: {
        foodName: payload.foodName,
        calories: payload.calories,
        ...(payload.weight != null ? { weight: payload.weight } : {}),
        ...(payload.volume != null ? { volume: payload.volume } : {}),
        ...(payload.mealType
          ? { mealType: toApiMealType(payload.mealType) }
          : {}),
      },
    },
    token,
  );
  return normalizeLogRecord(raw);
}

export async function getFoodLogs(
  token: string,
  filter: FoodLogFilter,
): Promise<FoodLogRecord[]> {
  const path = `/food-logs?filter=${encodeURIComponent(filter)}`;
  const raw = await apiRequestAuth<unknown>(path, { method: "GET" }, token);
  const data = raw as Record<string, unknown>;
  const arr =
    (Array.isArray(raw) && raw) ||
    (Array.isArray(data.data) && data.data) ||
    (Array.isArray(data.logs) && data.logs) ||
    [];
  return arr.map((row) => normalizeLogRecord(row));
}

export async function updateFoodLog(
  token: string,
  id: string,
  payload: Partial<FoodLogPayload>,
): Promise<FoodLogRecord> {
  const raw = await apiRequestAuth<unknown>(
    `/food-logs/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: {
        ...(payload.foodName != null ? { foodName: payload.foodName } : {}),
        ...(payload.calories != null ? { calories: payload.calories } : {}),
        ...(payload.weight != null ? { weight: payload.weight } : {}),
        ...(payload.volume != null ? { volume: payload.volume } : {}),
        ...(payload.mealType
          ? { mealType: toApiMealType(payload.mealType) }
          : {}),
      },
    },
    token,
  );
  return normalizeLogRecord(raw);
}

export async function deleteFoodLog(token: string, id: string): Promise<void> {
  await apiRequestAuth<unknown>(
    `/food-logs/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );
}
