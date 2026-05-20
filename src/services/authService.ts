import { ApiError, apiRequest, apiRequestAuthFirstPath, apiRequestFirstPath } from "./apiClient";

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
  id?: number;
  name: string;
  bmi: number;
  bmiCategory: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: Gender;
  calibration?: any;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const REGISTER_PATHS = ["/auth/register", "/register", "/users/register"] as const;
const LOGIN_PATHS = ["/auth/login", "/login", "/users/login"] as const;

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

function normalizeAuthResponse(
  raw: unknown,
  input?: Partial<RegisterRequest | LoginRequest>,
): AuthResponse | null {
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
      : null;

  if (!token) return null;

  const userId =
    readOptionalUserId(userSource?.id) ??
    readOptionalUserId(userSource?.userId) ??
    readOptionalUserId(userSource?._id) ??
    readOptionalUserId(data?.id) ??
    readOptionalUserId(data?.userId) ??
    readOptionalUserId(data?._id) ??
    readOptionalUserId(nested?.id) ??
    readOptionalUserId(nested?.userId) ??
    readOptionalUserId(nested?._id);

  const calibration =
    userSource?.calibration ??
    data?.calibration ??
    nested?.calibration ??
    undefined;

  return {
    token,
    user: {
      id: userId,
      name: String(name),
      bmi,
      bmiCategory,
      weight,
      height,
      age,
      gender,
      calibration,
    },
  };
}

export async function register(
  payload: RegisterRequest,
): Promise<AuthResponse> {
  let raw: unknown;
  try {
    raw = await apiRequestFirstPath<unknown>(REGISTER_PATHS, {
      method: "POST",
      body: payload,
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
      const minimalPayload = {
        name: payload.name,
        email: payload.email,
        password: payload.password,
      };
      raw = await apiRequestFirstPath<unknown>(REGISTER_PATHS, {
        method: "POST",
        body: minimalPayload,
      });
    } else {
      throw e;
    }
  }

  const normalized = normalizeAuthResponse(raw, payload);
  if (normalized) return normalized;

  // Some APIs create user on register but only return JWT from login.
  return login({ email: payload.email, password: payload.password });
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const res = await apiRequestFirstPath<unknown>(LOGIN_PATHS, {
    method: "POST",
    body: payload,
  });
  const normalized = normalizeAuthResponse(res, payload);
  if (!normalized) {
    throw new Error("Login succeeded but no auth token was returned by the API.");
  }
  return normalized;
}

export async function updateProfile(
  token: string,
  payload: Partial<AuthUser>,
): Promise<void> {
  await apiRequestAuthFirstPath<unknown>(
    ["/users/me", "/profile", "/me"],
    {
      method: "PUT",
      body: payload,
    },
    token,
  );
}

export interface GenderOption {
  label: string;
  value: string;
}

/** Backend has no gender-options route; values match profile/register API (`male` | `female`). */
export const DEFAULT_GENDER_OPTIONS: GenderOption[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

export async function getGenderOptions(): Promise<GenderOption[]> {
  return DEFAULT_GENDER_OPTIONS;
}
