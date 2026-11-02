import type { ApiError } from '@stamp-tour/shared';
import { clearAuth, getToken } from './auth';

export class ApiRequestError extends Error {
  status: number;
  distanceM?: number;

  constructor(status: number, body: ApiError) {
    super(body.error || `요청 실패 (${status})`);
    this.status = status;
    this.distanceM = body.distanceM;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiRequestError(401, { error: '다시 로그인해주세요.' });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: '요청에 실패했습니다.' }))) as ApiError;
    throw new ApiRequestError(res.status, body);
  }
  return res.json() as Promise<T>;
}
