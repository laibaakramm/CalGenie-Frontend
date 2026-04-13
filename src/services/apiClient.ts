import Constants from 'expo-constants';
import { Platform } from 'react-native';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Resolves `extra.API_BASE_URL` for the machine that actually runs the API
 * (handles localhost → LAN IP / Android emulator host).
 * This is the **server origin** only — may or may not already include `/api`.
 */
function resolveConfiguredServerBase(): string {
  const url = (Constants.expoConfig as any)?.extra?.API_BASE_URL;
  const configuredUrl =
    typeof url === 'string' && url.trim() !== '' ? url.trim() : 'http://localhost:5000';

  try {
    const parsed = new URL(configuredUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return configuredUrl.replace(/\/+$/, '');
    }

    const hostUri =
      (Constants.expoConfig as any)?.hostUri ??
      (Constants as any)?.expoGoConfig?.debuggerHost ??
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;

    if (typeof hostUri === 'string' && hostUri.length > 0) {
      const host = hostUri.split(':')[0];
      if (host) {
        parsed.hostname = host;
        return parsed.toString().replace(/\/+$/, '');
      }
    }

    if (Platform.OS === 'android') {
      parsed.hostname = '10.0.2.2';
      return parsed.toString().replace(/\/+$/, '');
    }

    return configuredUrl.replace(/\/+$/, '');
  } catch {
    return configuredUrl.replace(/\/+$/, '');
  }
}

/**
 * Base URL for JSON + multipart routes that live under `/api/...` on the server.
 * If you set `API_BASE_URL` to `http://host:5000/api`, we do **not** add another `/api`.
 */
export function getApiRootUrl(): string {
  const base = resolveConfiguredServerBase();
  if (base.toLowerCase().endsWith('/api')) {
    return base;
  }
  return `${base}/api`;
}

/**
 * @deprecated Use `getApiRootUrl()`. Kept as alias: this is the **API root** (`.../api`), not the bare server origin.
 * Route paths passed to `apiRequest` should be like `/auth/login`, `/dashboard` (no extra `/api` prefix).
 */
export const API_BASE_URL = getApiRootUrl();

type ApiRequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      `Unable to reach API at ${API_BASE_URL}. If you are using a physical device, set API_BASE_URL to your computer LAN IP (for example http://192.168.1.10:5000).`,
    );
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response; keep as null payload.
    }
  }

  if (!res.ok) {
    const message =
      (json as any)?.message ??
      (json as any)?.error ??
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, json);
  }

  return json as T;
}

/** JSON APIs that require `Authorization: Bearer <token>`. */
export async function apiRequestAuth<T>(
  path: string,
  options: ApiRequestOptions,
  token: string,
): Promise<T> {
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new ApiError('Not signed in', 401, null);
  }
  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${trimmed}`,
    },
  });
}

/**
 * Tries paths in order until one does not return 404. Re-throws the last error if all 404.
 */
export async function apiRequestAuthFirstPath<T>(
  paths: readonly string[],
  options: ApiRequestOptions,
  token: string,
): Promise<T> {
  let lastErr: unknown;
  for (const p of paths) {
    try {
      return await apiRequestAuth<T>(p, options, token);
    } catch (e) {
      lastErr = e;
      if (e instanceof ApiError && e.status === 404) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new ApiError('Request failed with status 404', 404, null);
}
