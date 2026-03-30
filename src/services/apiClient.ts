import Constants from 'expo-constants';

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

function getApiBaseUrl() {
  const url = (Constants.expoConfig as any)?.extra?.API_BASE_URL;
  return typeof url === 'string' && url.trim() !== '' ? url : 'http://localhost:3000';
}

const API_BASE_URL = getApiBaseUrl();

type ApiRequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

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

