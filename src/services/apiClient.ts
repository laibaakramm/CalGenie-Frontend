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

function getApiBaseUrl() {
  const url = (Constants.expoConfig as any)?.extra?.API_BASE_URL;
  const configuredUrl =
    typeof url === 'string' && url.trim() !== '' ? url.trim() : 'http://localhost:5000';

  // Handle common Expo networking pitfall:
  // "localhost" inside mobile runtime points to the device/emulator itself, not the dev machine.
  try {
    const parsed = new URL(configuredUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return configuredUrl;
    }

    const hostUri =
      (Constants.expoConfig as any)?.hostUri ??
      (Constants as any)?.expoGoConfig?.debuggerHost ??
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;

    if (typeof hostUri === 'string' && hostUri.length > 0) {
      const host = hostUri.split(':')[0];
      if (host) {
        parsed.hostname = host;
        return parsed.toString().replace(/\/$/, '');
      }
    }

    if (Platform.OS === 'android') {
      parsed.hostname = '10.0.2.2';
      return parsed.toString().replace(/\/$/, '');
    }

    return configuredUrl;
  } catch {
    return configuredUrl;
  }
}

const API_BASE_URL = getApiBaseUrl();

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

