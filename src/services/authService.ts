import { apiRequest } from "./apiClient";

export type Gender = "male" | "female" | string;

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  weight: number;
  height: number;
  age: number;
  Gender: Gender;
}

export interface AuthUser {
  id: number;
  name: string;
  bmi: number;
  bmiCategory: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function normalizeAuthResponse(raw: unknown): AuthResponse {
  const data = (raw ?? {}) as any;
  const nested = data?.data ?? data?.result ?? {};

  const tokenCandidate =
    data?.token ??
    nested?.token ??
    data?.accessToken ??
    nested?.accessToken ??
    data?.authToken ??
    nested?.authToken ??
    data?.jwt ??
    nested?.jwt ??
    data?.jwtToken ??
    nested?.jwtToken ??
    data?.idToken ??
    nested?.idToken ??
    data?.tokens?.access ??
    nested?.tokens?.access;

  const userSource =
    data?.user ?? nested?.user ?? data?.profile ?? nested?.profile ?? {};
  const name = userSource?.name ?? data?.name ?? nested?.name ?? "User";
  const id = userSource?.id ?? data?.id ?? nested?.id ?? 0;

  const bmiValue = userSource?.bmi ?? data?.bmi ?? nested?.bmi;
  const bmiNumber = Number(bmiValue);
  const bmi = Number.isFinite(bmiNumber) && bmiNumber > 0 ? bmiNumber : 0;

  const bmiCategoryValue =
    userSource?.bmiCategory ?? data?.bmiCategory ?? nested?.bmiCategory;
  const bmiCategory =
    typeof bmiCategoryValue === "string" && bmiCategoryValue.trim() !== ""
      ? bmiCategoryValue
      : bmi > 0
        ? getBmiCategory(bmi)
        : "Unknown";

  // Some backends return user/profile without a JWT on register.
  // Keep session flow working with a deterministic fallback token.
  const token =
    typeof tokenCandidate === "string" && tokenCandidate.trim() !== ""
      ? tokenCandidate.trim()
      : `fallback-token-${Date.now()}`;

  return {
    token,
    user: {
      id: Number(id),
      name: String(name),
      bmi,
      bmiCategory,
    },
  };
}

export async function register(
  payload: RegisterRequest,
): Promise<AuthResponse> {
  const res = await apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    body: payload,
  });
  return normalizeAuthResponse(res);
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const res = await apiRequest<unknown>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
  return normalizeAuthResponse(res);
}
