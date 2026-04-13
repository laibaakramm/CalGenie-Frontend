import { Platform } from "react-native";
import { API_BASE_URL } from "./apiClient";

export type ReferenceObject = "credit_card" | "a4_paper";

/** Image chosen from camera or library (pass through picker metadata for reliable multipart). */
export type PickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export interface DetectedFoodResult {
  calories: number;
  foodName: string;
}

function getFileNameFromUri(uri: string): string {
  const cleaned = uri.split("?")[0] ?? uri;
  const parts = cleaned.split("/");
  const last = parts[parts.length - 1];
  return last && last.includes(".") ? last : "";
}

function extensionFromMime(mime: string): string {
  const m = mime.toLowerCase().split(";")[0].trim();
  if (m === "image/png") return ".png";
  if (m === "image/webp") return ".webp";
  if (m === "image/heic" || m === "image/heif") return ".heic";
  return ".jpg";
}

function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

function resolveFileName(pick: PickedImage): string {
  const fromPicker =
    typeof pick.fileName === "string" && pick.fileName.trim() !== ""
      ? pick.fileName.trim()
      : "";
  const fromUri = getFileNameFromUri(pick.uri);
  let base = fromPicker || fromUri;
  if (!base.includes(".")) {
    const mimeRaw =
      typeof pick.mimeType === "string" && pick.mimeType.trim() !== ""
        ? pick.mimeType.trim()
        : "image/jpeg";
    base = `upload-${Date.now()}${extensionFromMime(mimeRaw)}`;
  }
  const safe = base.replace(/[^\w.\-]/g, "_");
  return safe.length > 0 ? safe : `upload-${Date.now()}.jpg`;
}

function resolveMimeType(pick: PickedImage, fileName: string): string {
  if (typeof pick.mimeType === "string" && pick.mimeType.trim() !== "") {
    return pick.mimeType.trim().split(";")[0].trim();
  }
  return getMimeTypeFromFileName(fileName);
}

async function appendImageField(
  formData: FormData,
  pick: PickedImage,
  fieldName: string,
) {
  const fileName = resolveFileName(pick);
  const mimeType = resolveMimeType(pick, fileName);

  if (Platform.OS === "web") {
    const response = await fetch(pick.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, fileName);
    return;
  }

  formData.append(fieldName, {
    uri: pick.uri,
    name: fileName,
    type: mimeType,
  } as any);
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getErrorMessage(parsed: unknown, status: number): string {
  const p = parsed as Record<string, unknown> | null;
  if (p && typeof p.message === "string") return p.message;
  if (p && typeof p.error === "string") return p.error;
  if (p && typeof p.detail === "string") return p.detail;
  if (Array.isArray(p?.errors)) {
    const first = p.errors[0] as unknown;
    if (typeof first === "string") return first;
    if (first && typeof (first as { msg?: string }).msg === "string") {
      return (first as { msg: string }).msg;
    }
  }
  return `Request failed with status ${status}`;
}

const CALIBRATE_PATHS = ["/calibrate", "/calibration", "/scan/calibrate"] as const;
const ANALYZE_PATHS = ["/scan/analyze", "/analyze", "/food/analyze"] as const;

const IMAGE_FIELD_NAMES = ["image", "file", "photo"] as const;

async function buildCalibrationForm(
  pick: PickedImage,
  userId: number,
  referenceObject: ReferenceObject,
  imageField: (typeof IMAGE_FIELD_NAMES)[number],
  useSnakeCase: boolean,
): Promise<FormData> {
  const fd = new FormData();
  await appendImageField(fd, pick, imageField);
  if (useSnakeCase) {
    fd.append("user_id", String(userId));
    fd.append("reference_object", referenceObject);
  } else {
    fd.append("userId", String(userId));
    fd.append("referenceObject", referenceObject);
  }
  return fd;
}

async function buildAnalyzeForm(
  pick: PickedImage,
  userId: number,
  imageField: (typeof IMAGE_FIELD_NAMES)[number],
  useSnakeCase: boolean,
): Promise<FormData> {
  const fd = new FormData();
  await appendImageField(fd, pick, imageField);
  if (useSnakeCase) {
    fd.append("user_id", String(userId));
  } else {
    fd.append("userId", String(userId));
  }
  return fd;
}

function calibrationFormBuilders(
  pick: PickedImage,
  userId: number,
  referenceObject: ReferenceObject,
): Array<() => Promise<FormData>> {
  const out: Array<() => Promise<FormData>> = [];
  for (const imgField of IMAGE_FIELD_NAMES) {
    out.push(() =>
      buildCalibrationForm(pick, userId, referenceObject, imgField, false),
    );
    out.push(() =>
      buildCalibrationForm(pick, userId, referenceObject, imgField, true),
    );
  }
  return out;
}

function analyzeFormBuilders(
  pick: PickedImage,
  userId: number,
): Array<() => Promise<FormData>> {
  const out: Array<() => Promise<FormData>> = [];
  for (const imgField of IMAGE_FIELD_NAMES) {
    out.push(() => buildAnalyzeForm(pick, userId, imgField, false));
    out.push(() => buildAnalyzeForm(pick, userId, imgField, true));
  }
  return out;
}

async function postMultipartUntilOk(
  relativePaths: readonly string[],
  formBuilders: Array<() => Promise<FormData>>,
): Promise<{ parsed: unknown }> {
  let lastStatus = 404;
  let lastParsed: unknown = null;

  for (const rel of relativePaths) {
    const path = rel.startsWith("/") ? rel : `/${rel}`;
    const url = `${API_BASE_URL}${path}`;
    for (const makeForm of formBuilders) {
      const formData = await makeForm();
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });
      const parsed = await readJsonResponse(response);
      if (response.ok) {
        return { parsed };
      }
      lastStatus = response.status;
      lastParsed = parsed;
      if (response.status !== 404) {
        throw new Error(getErrorMessage(parsed, response.status));
      }
    }
  }

  throw new Error(getErrorMessage(lastParsed, lastStatus));
}

export interface CalibrationResponse {
  success?: boolean;
  calibration?: unknown;
}

export async function submitReferenceCalibration(
  pick: PickedImage,
  userId: number,
  referenceObject: ReferenceObject,
): Promise<CalibrationResponse> {
  if (!pick?.uri?.trim()) {
    throw new Error("No image selected.");
  }

  const { parsed } = await postMultipartUntilOk(
    CALIBRATE_PATHS,
    calibrationFormBuilders(pick, userId, referenceObject),
  );

  const body = (parsed ?? {}) as CalibrationResponse;
  if (body.success === false) {
    throw new Error(getErrorMessage(parsed, 200));
  }

  return body;
}

function normalizeAnalyzeResponse(raw: unknown): DetectedFoodResult | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  if (data.success === false) return null;

  const totalRaw =
    data.total_calories ??
    data.totalCalories ??
    (data as { total?: unknown }).total;
  const total = Number(totalRaw);

  const results = Array.isArray(data.results) ? data.results : [];
  const names: string[] = [];
  let summed = 0;

  for (const row of results) {
    const r = row as Record<string, unknown>;
    const name =
      (typeof r.food_name === "string" && r.food_name) ||
      (typeof r.foodName === "string" && r.foodName) ||
      "";
    if (name.trim()) names.push(name.trim());

    const c = Number(r.calories);
    if (Number.isFinite(c) && c > 0) summed += c;
  }

  const calories =
    Number.isFinite(total) && total > 0 ? total : summed > 0 ? summed : NaN;

  const foodName =
    names.length > 0 ? names.join(", ") : "Detected food";

  if (!Number.isFinite(calories) || calories <= 0) {
    return null;
  }

  return { calories, foodName };
}

export async function analyzeFoodFromImage(
  pick: PickedImage,
  userId: number,
): Promise<DetectedFoodResult | null> {
  if (!pick?.uri?.trim()) return null;

  const { parsed } = await postMultipartUntilOk(
    ANALYZE_PATHS,
    analyzeFormBuilders(pick, userId),
  );

  if (!parsed) {
    throw new Error("Empty response from food analysis.");
  }

  return normalizeAnalyzeResponse(parsed);
}
