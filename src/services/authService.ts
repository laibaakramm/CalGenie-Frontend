import { apiRequest } from './apiClient';

export type Gender = 'male' | 'female' | string;

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
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
}

