import type { Appearance } from '@stamp-tour/shared';

export interface StoredUser {
  id: string;
  nickname: string;
  /** 온보딩 전이면 null, 이 필드가 생기기 전에 저장된 정보면 undefined */
  appearance?: Appearance | null;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: StoredUser) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function saveUser(user: StoredUser) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
