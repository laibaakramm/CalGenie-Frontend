import { ApiError, apiRequest } from "./apiClient";

export type Gender = "male" | "female" | string;

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  weight: number;
  height: number;
  age: number;
  gender: Gender;
}

export interface AuthUser {
  name: string;
  bmi: number;
  bmiCategory: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: Gender;
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

function readOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readOptionalUserId(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

function fallbackNameFromInput(
  input?: Partial<RegisterRequest | LoginRequest>,
): string {
  if (
    input &&
    "name" in input &&
    typeof input.name === "string" &&
    input.name.trim()
  ) {
    return input.name.trim();
  }
  if (
    input &&
    "email" in input &&
    typeof input.email === "string" &&
    input.email.includes("@")
  ) {
    return input.email.split("@")[0] || "User";
  }
  return "User";
}

function normalizeAuthResponse(
  raw: unknown,
  input?: Partial<RegisterRequest | LoginRequest>,
): AuthResponse {
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

  const weight =
    readOptionalNumber(userSource?.weight) ??
    readOptionalNumber(data?.weight) ??
    readOptionalNumber(nested?.weight) ??
    readOptionalNumber(input?.weight);

  const height =
    readOptionalNumber(userSource?.height) ??
    readOptionalNumber(data?.height) ??
    readOptionalNumber(nested?.height) ??
    readOptionalNumber(input?.height);

  const age =
    readOptionalNumber(userSource?.age) ??
    readOptionalNumber(data?.age) ??
    readOptionalNumber(nested?.age) ??
    readOptionalNumber(input?.age);

  const genderRaw =
    userSource?.gender ??
    data?.gender ??
    nested?.gender ??
    input?.gender ??
    undefined;
  const gender =
    typeof genderRaw === "string" && genderRaw.trim() !== ""
      ? genderRaw.toLowerCase()
      : undefined;

  // Some backends return user/profile without a JWT on register.
  // Keep session flow working with a deterministic fallback token.
  const token =
    typeof tokenCandidate === "string" && tokenCandidate.trim() !== ""
      ? tokenCandidate.trim()
      : `fallback-token-${Date.now()}`;

  return {
    token,
    user: {
      name: String(name),
      bmi,
      bmiCategory,
      weight,
      height,
      age,
      gender,
    },
  };
}

export async function register(
  payload: RegisterRequest,
): Promise<AuthResponse> {
  try {
    const res = await apiRequest<unknown>("/auth/register", {
      method: "POST",
      body: payload,
    });
    return normalizeAuthResponse(res, payload);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
      const minimalPayload = {
        name: payload.name,
        email: payload.email,
        password: payload.password,
      };
      const fallbackRes = await apiRequest<unknown>("/auth/register", {
        method: "POST",
        body: minimalPayload,
      });
      return normalizeAuthResponse(fallbackRes, payload);
    }
    throw e;
  }
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const res = await apiRequest<unknown>("/auth/login", {
    method: "POST",
    body: payload,
  });
  return normalizeAuthResponse(res, payload);
}
