import { getApiRootUrl } from "./apiClient";
import { Platform } from "react-native";

export interface DetectedFoodResult {
  calories: number;
  foodName: string;
}

export interface PickedImage {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export type CalibrationReferenceObject =
  | "credit_card"
  | "a4_paper"
  | "coin_1pkr";

export interface CalibrationResult {
  success: boolean;
  calibration?: Record<string, unknown>;
}

export interface FoodDetection {
  foodName: string;
  confidence: number;
  weightGrams: number;
  calories: number;
  cuisine: string;
}

export interface IndianScanResult {
  success: boolean;
  totalCalories: number;
  detections: FoodDetection[];
  cuisine: string;
}

function buildFileName(image: PickedImage): string {
  if (image.fileName && image.fileName.trim()) return image.fileName.trim();
  const ext = image.mimeType?.includes("png") ? "png" : "jpg";
  return `upload.${ext}`;
}

async function appendImage(formData: FormData, image: PickedImage): Promise<void> {
  const filename = buildFileName(image);
  const mimeType = image.mimeType ?? "image/jpeg";

  if (Platform.OS === "web") {
    // Web expects a Blob/File in multipart body.
    const response = await fetch(image.uri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
    return;
  }

  // Native expects a `{ uri, type, name }` file-like object.
  formData.append("image", {
    uri: image.uri,
    type: mimeType,
    name: filename,
  } as any);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAnalyzeResponse(raw: unknown): DetectedFoodResult | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  const results = Array.isArray(data.results) ? data.results : [];
  const first = (results[0] ?? {}) as Record<string, unknown>;
  const firstFoodName =
    (typeof first.foodClass === "string" && first.foodClass) ||
    (typeof first.food_name === "string" && first.food_name) ||
    (typeof first.foodName === "string" && first.foodName) ||
    null;

  const summedCalories = results.reduce((sum, row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    return sum + toNumber(r.calories);
  }, 0);

  const total = toNumber(data.total_calories ?? data.totalCalories ?? data.calories);
  const resolvedCalories = total > 0 ? total : summedCalories;

  const hasDetectedFood = firstFoodName != null || results.length > 0;
  const hasCaloriesField =
    data.total_calories != null ||
    data.totalCalories != null ||
    data.calories != null ||
    results.some((row) => ((row ?? {}) as Record<string, unknown>).calories != null);

  if (!hasDetectedFood && !hasCaloriesField) {
    return null;
  }

  return {
    calories: Math.max(0, Math.round(resolvedCalories)),
    foodName: firstFoodName ?? "Detected item",
  };
}

/**
 * Placeholder — not used yet
 */
export async function detectCaloriesFromImage(
  _imageUri: string,
): Promise<DetectedFoodResult | null> {
  return null;
}

/**
 * Sends one-time calibration image to backend.
 * POST /api/calibrate
 */
export async function submitReferenceCalibration(
  image: PickedImage,
  userId: number,
  referenceObject: CalibrationReferenceObject,
): Promise<CalibrationResult> {
  const formData = new FormData();
  await appendImage(formData, image);
  formData.append("userId", String(userId));
  formData.append("referenceObject", referenceObject);

  const apiRoot = getApiRootUrl();
  const res = await fetch(`${apiRoot}/calibrate`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (json as Record<string, unknown>)?.error ??
      (json as Record<string, unknown>)?.message ??
      "Calibration failed";
    throw new Error(String(message));
  }

  return json as CalibrationResult;
}

/**
 * Sends meal image to backend for calorie analysis.
 * POST /api/scan/analyze
 */
export async function analyzeFoodFromImage(
  image: PickedImage,
  userId: number,
): Promise<DetectedFoodResult | null> {
  const formData = new FormData();
  await appendImage(formData, image);
  formData.append("userId", String(userId));

  const apiRoot = getApiRootUrl();
  const res = await fetch(`${apiRoot}/scan/analyze`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (json as Record<string, unknown>)?.error ??
      (json as Record<string, unknown>)?.message ??
      "Scan failed";
    throw new Error(String(message));
  }

  return normalizeAnalyzeResponse(json);
}

/**
 * Sends food image to Indian food detection endpoint
 * POST /api/indian-scan
 */
export async function scanIndianFood(
  imageUri: string,
  userId: number,
  token: string,
): Promise<IndianScanResult> {
  const formData = new FormData();
  await appendImage(formData, { uri: imageUri, fileName: "food.jpg" });
  formData.append("userId", userId.toString());

  const apiRoot = getApiRootUrl();
  const res = await fetch(`${apiRoot}/indian-scan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Scan failed");
  }

  return res.json();
}
